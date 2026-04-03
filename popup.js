// popup.js — Immich Quick Download v2

const DEFAULTS = {
  immichApiKey:    "",
  immichUrl:       "",
  jpgQuality:      92,
  convertHeic:     true,
  filenamePattern: "{date}_{name}",
  downloadFolder:  "Immich",
  conflictAction:  "uniquify",
  toastPosition:   "bottom-right",
  toastDuration:   3500,
  showBatchCount:  true,
};

// ── Tabs ─────────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
  });
});

// ── Load settings ─────────────────────────────────────────────────────────────
chrome.storage.sync.get(DEFAULTS, (s) => {
  document.getElementById("apiKey").value          = s.immichApiKey    || "";
  document.getElementById("immichUrl").value        = s.immichUrl        || "";
  document.getElementById("jpgQuality").value       = s.jpgQuality;
  document.getElementById("qualityVal").textContent = s.jpgQuality + "%";
  document.getElementById("convertHeic").checked    = s.convertHeic;
  document.getElementById("filenamePattern").value  = s.filenamePattern;
  document.getElementById("downloadFolder").value   = s.downloadFolder  || "";
  document.getElementById("conflictAction").value   = s.conflictAction;
  document.getElementById("toastPosition").value    = s.toastPosition;
  document.getElementById("toastDuration").value    = s.toastDuration;
  document.getElementById("toastVal").textContent   = (s.toastDuration / 1000).toFixed(1) + "s";
  document.getElementById("showBatchCount").checked = s.showBatchCount;
  updateQualityVisibility();
  updatePreview(s.filenamePattern);
});

// ── Range live update ─────────────────────────────────────────────────────────
document.getElementById("jpgQuality").addEventListener("input", function () {
  document.getElementById("qualityVal").textContent = this.value + "%";
});
document.getElementById("toastDuration").addEventListener("input", function () {
  document.getElementById("toastVal").textContent = (this.value / 1000).toFixed(1) + "s";
});

// ── HEIC toggle hides quality slider if off ───────────────────────────────────
function updateQualityVisibility() {
  const on = document.getElementById("convertHeic").checked;
  document.getElementById("qualityField").style.opacity = on ? "1" : "0.35";
}
document.getElementById("convertHeic").addEventListener("change", updateQualityVisibility);

// ── Pattern preview ───────────────────────────────────────────────────────────
function updatePreview(pattern) {
  const now    = new Date();
  const pad    = n => String(n).padStart(2, "0");
  const date   = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
  const time   = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const result = (pattern || "{date}_{name}")
    .replace("{date}",     date)
    .replace("{datetime}", `${date}_${time}`)
    .replace("{name}",     "IMG_4821")
    .replace("{album}",    "Urlaub-2024")
    .replace("{id}",       "a1b2c3d4")
    .replace("{index}",    "001");
  const el = document.getElementById("patternPreview");
  if (el) el.textContent = "Vorschau: " + result + ".jpg";
}

document.getElementById("filenamePattern").addEventListener("input", function () {
  updatePreview(this.value);
});

// Token click → insert at cursor
document.querySelectorAll(".token").forEach(token => {
  token.addEventListener("click", () => {
    const input = document.getElementById("filenamePattern");
    const pos   = input.selectionStart;
    const val   = input.value;
    const insert = token.dataset.token;
    input.value = val.slice(0, pos) + insert + val.slice(pos);
    input.selectionStart = input.selectionEnd = pos + insert.length;
    input.focus();
    updatePreview(input.value);
  });
});

// ── Save helpers ──────────────────────────────────────────────────────────────
function showStatus(id, msg, ok = true) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.color = ok ? "#22c55e" : "#ef4444";
  setTimeout(() => (el.textContent = ""), 2200);
}

function saveAll(statusId) {
  const settings = {
    immichApiKey:    document.getElementById("apiKey").value.trim(),
    immichUrl:       document.getElementById("immichUrl").value.trim(),
    jpgQuality:      Number(document.getElementById("jpgQuality").value),
    convertHeic:     document.getElementById("convertHeic").checked,
    filenamePattern: document.getElementById("filenamePattern").value.trim() || "{date}_{name}",
    downloadFolder:  document.getElementById("downloadFolder").value.trim(),
    conflictAction:  document.getElementById("conflictAction").value,
    toastPosition:   document.getElementById("toastPosition").value,
    toastDuration:   Number(document.getElementById("toastDuration").value),
    showBatchCount:  document.getElementById("showBatchCount").checked,
  };
  chrome.storage.sync.set(settings, () => {
    showStatus(statusId, "✅ Gespeichert!");
  });
}

document.getElementById("saveBtn").addEventListener("click",  () => saveAll("status"));
document.getElementById("saveBtn2").addEventListener("click", () => saveAll("status2"));
document.getElementById("saveBtn3").addEventListener("click", () => saveAll("status3"));

// ── Shortcuts link ────────────────────────────────────────────────────────────
document.getElementById("openShortcuts").addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

// ── Enter to save on auth tab ─────────────────────────────────────────────────
document.getElementById("apiKey").addEventListener("keydown", e => {
  if (e.key === "Enter") saveAll("status");
});
