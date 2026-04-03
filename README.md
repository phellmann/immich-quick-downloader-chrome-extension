# 📷 Immich Quick Download

A Chrome/Edge browser extension that lets you download photos from your self-hosted [Immich](https://immich.app) instance with a single keyboard shortcut — with automatic HEIC→JPG conversion and fully customizable filenames.

> Built for self-hosters who want a faster, keyboard-driven photo workflow.

---

## Features

- **`Alt+D`** — download the current photo instantly, no dialog
- **`Alt+Shift+D`** — download the original file (no conversion)
- **HEIC → JPG conversion** — automatic, browser-side or via Immich's internal JPEG
- **Custom filename patterns** — e.g. `{date}_{name}` → `20241225_IMG_4821.jpg`
- **Custom download folder** — files go directly to a subfolder, no save-as dialog
- **Batch download** — select multiple photos in Immich, press `Alt+D`, all download in sequence
- **Configurable JPG quality** — slider from 70–100%
- **Conflict handling** — auto-number duplicates or overwrite
- **Toast notifications** — position and duration configurable
- **No cloud, no tracking** — works entirely on your local network

---

## Screenshots
![ImmichQuickDownload_Screenshot_01](https://github.com/user-attachments/assets/3ec4f0e8-0ada-44ae-9212-9037ec4a0332)
![ImmichQuickDownload_Screenshot_02](https://github.com/user-attachments/assets/49f2da02-7166-4810-b7dd-d62718f814b3)
![ImmichQuickDownload_Screenshot_03](https://github.com/user-attachments/assets/57ac1732-bd9c-477f-828a-561f51d49b4f)
![ImmichQuickDownload_Screenshot_04](https://github.com/user-attachments/assets/893d6c32-d286-48d8-81ab-47916ae90358)

---

## Installation

> The extension is not listed on the Chrome Web Store. Install it as an unpacked extension (takes ~30 seconds).

1. **Download** the [latest release ZIP](../../releases/latest) and unzip it — you'll get a folder called `immich-downloader`
2. Open Chrome or Edge and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top right)
4. Click **"Load unpacked"** and select the `immich-downloader` folder
5. Click the extension icon and enter your **Immich API key**
6. Done — press `Alt+D` on any Immich photo

### Getting your API key

In Immich: **Account Settings → API Keys → New API Key**

The key only needs `asset.read` permission.

---

## Usage

### Single photo

Open any photo in Immich (the URL should contain `/photos/<id>` or `?assetId=...`), then:

| Shortcut | Action |
|---|---|
| `Alt+D` | Download — converts HEIC to JPG if enabled |
| `Alt+Shift+D` | Download original file without conversion |

### Batch download

1. Enter Immich's multi-select mode (click the checkbox on any photo)
2. Select all photos you want
3. Press `Alt+D`
4. All files download in sequence with `{index}` numbering if configured

---

## Configuration

Click the extension icon to open settings. All settings are synced via your Chrome profile.

### 🔑 Auth

| Setting | Description |
|---|---|
| API Key | Your Immich API key |
| Immich URL | Optional — auto-detected from the current tab URL |

### 📁 Files

| Setting | Default | Description |
|---|---|---|
| Download folder | `Immich` | Subfolder within your browser's download directory |
| Filename pattern | `{date}_{name}` | See tokens below |
| Conflict handling | Uniquify | Auto-number or overwrite existing files |

**Filename tokens:**

| Token | Example output |
|---|---|
| `{date}` | `20241225` |
| `{datetime}` | `20241225_143022` |
| `{name}` | `IMG_4821` (original filename without extension) |
| `{album}` | `Urlaub-2024` |
| `{id}` | `a1b2c3d4` (first 8 chars of asset ID) |
| `{index}` | `001` (useful for batch downloads) |

Example patterns:

```
{date}_{name}          →  20241225_IMG_4821.jpg
{datetime}_{name}      →  20241225_143022_IMG_4821.jpg
{album}/{date}_{name}  →  Urlaub-2024/20241225_IMG_4821.jpg
```

### 🖼 Format

| Setting | Default | Description |
|---|---|---|
| Convert HEIC → JPG | On | Applies on `Alt+D`; use `Alt+Shift+D` to skip |
| JPG quality | 92% | 92 = visually lossless at ~40% smaller than 100 |
| Toast position | Bottom right | Where download notifications appear |
| Toast duration | 3.5s | How long notifications stay visible |
| Show batch progress | On | Updates toast count during batch downloads |

### ⌨️ Shortcuts

Shortcuts can be customized at `chrome://extensions/shortcuts`.

---

## HEIC Conversion

The extension uses a two-stage approach — no external services, no uploads:

1. **Native browser decode** — works on macOS Chrome and Safari with Apple codecs installed. The image is drawn to a canvas and exported as JPEG at your configured quality.
2. **Immich server fallback** — Immich internally generates a full-resolution JPEG from every HEIC file. If native decode fails (e.g. Windows Chrome without HEIC codec), the extension fetches this pre-rendered JPEG directly from your server.

The original HEIC file on your Immich server is never modified.

---

## Requirements

- Chrome 88+ or Edge 88+ (Manifest V3 support)
- A self-hosted Immich instance (any recent version)
- Network access to your Immich server from the browser

---

## Project structure

```
immich-downloader/
├── manifest.json       # Extension manifest (MV3)
├── background.js       # Service worker — keyboard commands & download API
├── content.js          # Main logic — asset detection, API calls, conversion
├── popup.html          # Settings UI
├── popup.js            # Settings logic
├── lib/
│   └── heic2any.min.js # HEIC conversion (native canvas + Immich fallback)
└── icons/
    ├── icon48.png
    └── icon128.png
```

---

## Contributing

Pull requests are welcome. For larger changes, please open an issue first.

If you find a bug, please include:
- Chrome/Edge version
- Immich version
- The URL pattern your Immich uses (e.g. local IP, subdomain)
- Console output from the browser DevTools (`F12 → Console`)

---

## License

MIT — see [LICENSE](LICENSE)

---

## Acknowledgements

- [Immich](https://immich.app) — the excellent open-source photo management platform this extension is built for
- HEIC fallback strategy inspired by Immich's own internal transcoding pipeline
