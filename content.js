// content.js — Immich Quick Download v2.0

(function () {
  "use strict";

  // ─── Default settings ────────────────────────────────────────────────────────
  const DEFAULTS = {
    immichApiKey: "",
    jpgQuality: 92,
    convertHeic: true,           // true = always JPG, false = keep original
    filenamePattern: "{date}_{name}",
    downloadMode:   "direct",    // direct = no dialog, browser = use Chrome settings
    downloadFolder: "Immich",    // relative to Chrome downloads root (only used in direct mode)
    conflictAction: "uniquify",  // uniquify | overwrite
    toastPosition: "bottom-right",
    toastDuration: 3500,
    showBatchCount: true,
  };

  function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(DEFAULTS, (r) => resolve({ ...DEFAULTS, ...r }));
    });
  }

  // ─── URL / asset helpers ─────────────────────────────────────────────────────

  function getImmichBase() {
    return `${location.protocol}//${location.host}`;
  }

  function getAssetIdFromUrl() {
    const url = window.location.href;
    const qp = new URL(url).searchParams.get("assetId");
    if (qp) return qp;
    const m1 = url.match(/\/photos\/([0-9a-f-]{36})/i);
    if (m1) return m1[1];
    const m2 = url.match(/\/albums\/[^/]+\/([0-9a-f-]{36})/i);
    if (m2) return m2[1];
    return null;
  }

  /** Try to read selected asset IDs from Immich's multi-select UI.
   *  Immich renders checkboxes with data-asset-id attributes when in select mode. */
  function getSelectedAssetIds() {
    // Immich selection: checked checkboxes carry the asset id in closest [data-asset-id]
    const checked = document.querySelectorAll(
      '[data-asset-id] input[type="checkbox"]:checked, [data-testid="asset-checkbox"]:checked'
    );
    if (checked.length > 0) {
      return [...new Set([...checked].map(el => {
        const parent = el.closest("[data-asset-id]");
        return parent ? parent.getAttribute("data-asset-id") : null;
      }).filter(Boolean))];
    }
    return [];
  }

  // ─── Filename builder ─────────────────────────────────────────────────────────

  function formatDate(iso) {
    if (!iso) return "00000000";
    const d = new Date(iso);
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("");
  }

  function formatDateTime(iso) {
    if (!iso) return "00000000_000000";
    const d = new Date(iso);
    const date = [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("");
    const time = [String(d.getHours()).padStart(2,"0"), String(d.getMinutes()).padStart(2,"0"), String(d.getSeconds()).padStart(2,"0")].join("");
    return `${date}_${time}`;
  }

  function buildFilename(pattern, meta, ext, index) {
    const originalName = meta.originalFileName || `photo_${meta.id}`;
    const stem = originalName.replace(/\.[^.]+$/, "");
    const iso = meta.localDateTime || meta.fileCreatedAt || "";

    return pattern
      .replace("{date}",     formatDate(iso))
      .replace("{datetime}", formatDateTime(iso))
      .replace("{name}",     stem)
      .replace("{id}",       meta.id.slice(0, 8))
      .replace("{album}",    (meta.albumName || "NoAlbum").replace(/[/\\?%*:|"<>]/g, "-"))
      .replace("{index}",    String(index).padStart(3, "0"))
      + "." + ext;
  }

  // ─── Toast ───────────────────────────────────────────────────────────────────

  function showToast(msg, isError = false, settings = {}) {
    const pos = settings.toastPosition || "bottom-right";
    const duration = settings.toastDuration || 3500;

    const existing = document.getElementById("immich-dl-toast");
    if (existing) existing.remove();

    const el = document.createElement("div");
    el.id = "immich-dl-toast";
    el.textContent = msg;

    const posStyles = {
      "bottom-right": { bottom: "32px", right: "32px" },
      "bottom-left":  { bottom: "32px", left:  "32px" },
      "top-right":    { top:    "32px", right: "32px" },
      "top-left":     { top:    "32px", left:  "32px" },
    }[pos] || { bottom: "32px", right: "32px" };

    Object.assign(el.style, {
      position: "fixed",
      zIndex: "999999",
      background: isError ? "#c0392b" : "#1a7a4a",
      color: "#fff",
      padding: "12px 18px",
      borderRadius: "8px",
      fontSize: "13px",
      fontFamily: "sans-serif",
      boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
      opacity: "1",
      transition: "opacity 0.4s",
      maxWidth: "360px",
      lineHeight: "1.5",
      ...posStyles,
    });
    document.body.appendChild(el);

    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 500);
    }, duration);
  }

  // ─── HEIC conversion ─────────────────────────────────────────────────────────

  async function convertHeicBlob(arrayBuffer, quality, fallbackCtx) {
    // Delegates to lib/heic2any.min.js → window.convertHeic()
    // Pipeline: ImageDecoder API → canvas decode → Immich fullsize → Immich preview (1440px, warns)
    return await window.convertHeic(arrayBuffer, quality, fallbackCtx);
  }

  // ─── Single asset download ───────────────────────────────────────────────────

  async function downloadAsset(assetId, settings, index = 0, forceOriginal = false) {
    const base   = getImmichBase();
    const apiKey = settings.immichApiKey;

    // Metadata
    const metaRes = await fetch(`${base}/api/assets/${assetId}`,
      { headers: { "x-api-key": apiKey } });
    if (!metaRes.ok) throw new Error(`Metadata ${metaRes.status}`);
    const meta = await metaRes.json();

    const originalName = meta.originalFileName || `photo_${assetId}`;
    const origExt = originalName.split(".").pop().toLowerCase();
    const isHeic  = origExt === "heic" || origExt === "heif";
    const doConvert = !forceOriginal && settings.convertHeic && isHeic;

    // Download original file
    const fileRes = await fetch(`${base}/api/assets/${assetId}/original`,
      { headers: { "x-api-key": apiKey } });
    if (!fileRes.ok) throw new Error(`Download ${fileRes.status}`);
    const buffer = await fileRes.arrayBuffer();

    let finalBlob, finalExt, mimeType;

    if (doConvert) {
      showToast("🔄 Konvertiere HEIC → JPG…", false, settings);
      const heicResult = await convertHeicBlob(buffer, settings.jpgQuality,
        { base, assetId, apiKey });
      finalBlob = heicResult.blob;
      finalExt  = "jpg";
      mimeType  = "image/jpeg";
      if (heicResult.method === "preview") {
        showToast("⚠️ Nur 1440px Preview (kein HEVC Codec verfügbar). Für volle Auflösung: 'HEVC Video Extensions' im Microsoft Store installieren — oder in Immich Admin → Einstellungen → Bild → Vollgröße aktivieren.", true, settings);
      } else if (heicResult.method === "fullsize") {
        // full res from Immich server-side, no extra toast needed
      }
    } else {
      const mimeMap = { jpg:"image/jpeg", jpeg:"image/jpeg", png:"image/png",
                        gif:"image/gif",  webp:"image/webp", heic:"image/heic",
                        heif:"image/heif" };
      mimeType  = mimeMap[origExt] || "image/jpeg";
      finalBlob = new Blob([buffer], { type: mimeType });
      finalExt  = origExt;
    }

    const filename = buildFilename(settings.filenamePattern, meta, finalExt, index);

    const objectUrl = URL.createObjectURL(finalBlob);

    if (settings.downloadMode === "direct") {
      // Direct <a> click — goes straight to the default download folder,
      // no dialog, regardless of Chrome's "ask where to save" setting.
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    } else {
      // Browser mode — use chrome.downloads API, respects Chrome's own
      // download folder setting and shows the save dialog if the user
      // has "Ask where to save each file" enabled in Chrome.
      chrome.runtime.sendMessage({
        action: "triggerDownload",
        url: objectUrl,
        filename,
      });
      setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    }

    return filename;
  }

  // ─── Main entry ─────────────────────────────────────────────────────────────

  async function run(forceOriginal = false) {
    const settings = await getSettings();

    if (!settings.immichApiKey) {
      showToast("⚠️ Kein API-Key — bitte Extension-Icon klicken", true, settings);
      return;
    }

    // Check for multi-selection first
    const selected = getSelectedAssetIds();
    const assetId  = getAssetIdFromUrl();

    if (selected.length > 1) {
      // Batch download
      showToast(`⬇️ Lade ${selected.length} Fotos herunter…`, false, settings);
      let done = 0, errors = 0;
      for (let i = 0; i < selected.length; i++) {
        try {
          await downloadAsset(selected[i], settings, i + 1, forceOriginal);
          done++;
          if (settings.showBatchCount) {
            showToast(`⬇️ ${done}/${selected.length} heruntergeladen…`, false, settings);
          }
        } catch (e) {
          errors++;
          console.error("[Immich DL] batch error", e);
        }
      }
      const errMsg = errors > 0 ? ` (${errors} Fehler)` : "";
      showToast(`✅ ${done} Fotos fertig${errMsg}`, errors > 0, settings);

    } else if (assetId) {
      // Single download
      showToast("⬇️ Lade herunter…", false, settings);
      try {
        const filename = await downloadAsset(assetId, settings, 1, forceOriginal);
        const label = forceOriginal ? "Original" : "";
        showToast(`✅ ${label ? label + ": " : ""}${filename}`, false, settings);
      } catch (e) {
        console.error("[Immich DL]", e);
        showToast(`❌ ${e.message}`, true, settings);
      }

    } else {
      showToast("⚠️ Kein Foto erkannt — öffne ein Foto oder wähle mehrere aus", true, settings);
    }
  }

  // ─── Keyboard listener ───────────────────────────────────────────────────────

  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    // Alt+D = download (with conversion)
    if (e.key === "d" && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      run(false);
    }
    // Alt+Shift+D = download original
    if (e.key === "D" && e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      run(true);
    }
  });

  // ─── Message from background ─────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "downloadPhoto") {
      run(msg.forceOriginal || false);
    }
  });

})();
