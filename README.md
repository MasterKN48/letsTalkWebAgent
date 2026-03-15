# 🌐 Let'sTalk.live

**[🔴 Live Demo](https://MasterKN48.github.io/letsTalkWebAgent/)**

> Real-time AI voice translation with on-device speech-to-text, LLM translation, and neural text-to-speech — running entirely in your browser via WebAssembly. No server, no API key, full privacy.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🎙️ Live voice recording | Tap the mic, speak — VAD auto-detects when you've finished |
| 🧠 On-device STT | Whisper Tiny EN (sherpa-onnx WASM) |
| 🤖 On-device LLM translation | LFM2 350M (llama.cpp WASM, Liquid AI) |
| 🔊 On-device TTS | Piper TTS EN Lessac (sherpa-onnx WASM) |
| 🌍 Language selector | Source + Target language (8 languages) |
| 🎭 Voice clone toggle | UI ready (pipeline hook available) |
| 📊 Live metrics | Real latency, accuracy, words/sec from each turn |
| 🌙 Dark / Light mode | System-aware toggle |
| 📱 PWA | Installable on mobile & desktop |
| ⚡ Vite + Bun | Sub-200ms builds, fast HMR |

---

## 🏗️ Architecture

```
User speaks
    │
    ▼
AudioCapture (16 kHz mic)
    │
    ▼
VAD — Silero VAD v5 (detects speech end)
    │   ← popSpeechSegment()
    ▼
VoicePipeline.processTurn(audioSamples)
    │
    ├── STT  ——→ Whisper Tiny EN  ——→ transcript text
    │
    ├── LLM  ——→ LFM2 350M        ——→ translation (streamed token by token)
    │
    └── TTS  ——→ Piper EN Lessac  ——→ Float32Array audio → AudioPlayback
```

All 4 models run in-browser using WebAssembly (llama.cpp + sherpa-onnx). **Zero network calls after the one-time model download.**

---

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.x  
- Chrome 96+ or Edge 96+ (required for WebGPU / SharedArrayBuffer)

### Install & Run

```bash
# Clone / enter the project
cd WebVoiceAgent

# Install dependencies
bun install

# Start dev server (with COOP/COEP headers for SharedArrayBuffer)
bun run dev
```

Open **http://localhost:5173** and tap the microphone button.

> ⚠️ **First run**: The app will download ~425 MB of AI models (VAD 5MB + STT 105MB + LLM 250MB + TTS 65MB). These are stored permanently in your browser's OPFS — subsequent starts load instantly from cache.

---

## 📁 Project Structure

```
WebVoiceAgent/
├── public/                  # Static assets (favicon, PWA icons)
├── src/
│   ├── App.jsx              # Main UI + full voice pipeline logic
│   ├── runanywhere.js       # SDK init, model registration (reads .env)
│   ├── constants.js         # Language list, metrics defaults
│   ├── index.css            # Tailwind + custom dark mode / glassmorphism CSS
│   └── main.jsx             # React entry point
├── .env                     # Model IDs and LLM settings (see below)
├── vite.config.js           # Vite + PWA + WASM + COOP/COEP config
├── tailwind.config.js       # Custom brand colours, dark mode class strategy
├── index.html               # SEO meta tags, OG tags, theme-color
└── RunanywhereGuide.md      # Full RunAnywhere Web SDK reference docs
```

---

## ⚙️ Environment Variables (`.env`)

All model IDs and LLM settings live in `.env`. Change these to swap models without touching code.

```env
# RunAnywhere Model IDs
VITE_MODEL_LLM_ID=lfm2-350m-q4_k_m
VITE_MODEL_STT_ID=sherpa-onnx-whisper-tiny.en
VITE_MODEL_TTS_ID=vits-piper-en_US-lessac-medium
VITE_MODEL_VAD_ID=silero-vad-v5

# LLM generation settings
VITE_LLM_MAX_TOKENS=80
VITE_LLM_TEMPERATURE=0.7
```

### Swapping Models

| Slot | Current | Upgrade option |
|---|---|---|
| **LLM** | `lfm2-350m-q4_k_m` | `lfm2-1.2b-tool-q4_k_m` (800MB, better quality) |
| **STT** | `sherpa-onnx-whisper-tiny.en` | Whisper Base EN (larger, more accurate) |
| **TTS** | `vits-piper-en_US-lessac-medium` | Any [Piper voice](https://rhasspy.github.io/piper-samples/) |
| **VAD** | `silero-vad-v5` | Same (no alternatives needed) |

---

## 🔧 Key Files Explained

### `src/runanywhere.js` — SDK Initialization

This file initialises the RunAnywhere SDK **once** (idempotent cached-promise pattern) and registers all 4 AI models pulled from `.env`.

```js
await initSDK();  // safe to call from multiple components — runs only once
```

It exports:
- `initSDK()` — async, idempotent SDK init
- `ModelManager` — download/load/query models
- `ModelCategory` — enum for VAD, STT, LLM, TTS
- `MODEL_IDS` — model IDs read from `.env`

### `src/App.jsx` — UI + Voice Pipeline

The main component handles the full pipeline state machine:

| Stage | Meaning |
|---|---|
| `idle` | Waiting for user to tap mic |
| `sdk_init` | Initialising WASM backends |
| `downloading` | Downloading model files from HuggingFace |
| `loading` | Loading models into WASM memory |
| `listening` | Mic active, VAD processing audio |
| `processing` | Speech segment detected, running STT |
| `generating` | LLM generating translation (tokens streamed live) |
| `speaking` | TTS audio playing |
| `error` | Something went wrong (message shown, tap to retry) |

Key hooks used:
- `AudioCapture` — microphone capture at 16 kHz
- `VAD.onSpeechActivity()` — fires when user stops speaking
- `VoicePipeline.processTurn()` — runs STT → LLM → TTS
- `EventBus.shared.on('model.downloadProgress')` — live download %

### `vite.config.js` — Build Configuration

Critical settings for RunAnywhere to work:

```js
server: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'credentialless',
  }
}
// ↑ Required for SharedArrayBuffer (multi-threaded WASM)

optimizeDeps: {
  exclude: ['@runanywhere/web-llamacpp', '@runanywhere/web-onnx'],
}
// ↑ Critical: prevents Vite from pre-bundling WASM packages
//   so import.meta.url resolves to correct WASM file paths

worker: { format: 'es' }
// ↑ Required for VLM web workers (future use)
```

The `copyWasmPlugin()` copies WASM binaries from `node_modules` into `dist/assets/` at build time so they're served correctly in production.

---

## 🛠️ Available Scripts

```bash
bun run dev       # Start dev server at http://localhost:5173 (with COOP/COEP headers)
bun run build     # Production build → dist/
bun run preview   # Serve the built dist/ at http://localhost:4173
```

---

## 🌐 Deploying to Production

The `dist/` folder is a self-contained static site. Deploy it anywhere that supports custom HTTP headers.

### Vercel (`vercel.json`)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "credentialless" }
      ]
    },
    {
      "source": "/assets/(.*).wasm",
      "headers": [
        { "key": "Content-Type", "value": "application/wasm" },
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

### Netlify (`netlify.toml`)

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "credentialless"
```

> ⚠️ The COOP/COEP headers are **required**. Without them, `SharedArrayBuffer` is unavailable and WASM falls back to single-threaded mode (significantly slower).

---

## 📦 Dependencies

| Package | Purpose |
|---|---|
| `react` + `react-dom` | UI framework |
| `@runanywhere/web` | Core SDK — RunAnywhere, ModelManager, VoicePipeline, AudioCapture, EventBus |
| `@runanywhere/web-llamacpp` | LLM/VLM backend — llama.cpp compiled to WASM |
| `@runanywhere/web-onnx` | STT/TTS/VAD backend — sherpa-onnx compiled to WASM |
| `vite` | Build tool |
| `vite-plugin-pwa` | Progressive Web App support |
| `tailwindcss` | Styling |

---

## 🤖 AI Models Used

All models are downloaded from **HuggingFace** on first use and cached locally in the browser's OPFS.

| Model | HuggingFace Repo | Size | Role |
|---|---|---|---|
| LFM2 350M Q4_K_M | `LiquidAI/LFM2-350M-GGUF` | ~250 MB | Translation LLM |
| Whisper Tiny EN | `runanywhere/sherpa-onnx-whisper-tiny.en` | ~105 MB | Speech-to-Text |
| Piper TTS Lessac | `runanywhere/vits-piper-en_US-lessac-medium` | ~65 MB | Text-to-Speech |
| Silero VAD v5 | `runanywhere/silero-vad-v5` | ~5 MB | Voice Activity Detection |

**Total download: ~425 MB** (one-time, then cached forever in OPFS).

---

## 🧩 How to Add a New Language (TTS)

1. Find a [Piper voice model](https://rhasspy.github.io/piper-samples/) for your language
2. Add the model entry to `src/runanywhere.js`:
   ```js
   {
     id: 'vits-piper-de_DE-thorsten-medium',
     name: 'Piper TTS German',
     url: 'https://huggingface.co/runanywhere/vits-piper-de_DE-thorsten-medium/resolve/main/vits-piper-de_DE-thorsten-medium.tar.gz',
     framework: LLMFramework.ONNX,
     modality: ModelCategory.SpeechSynthesis,
     memoryRequirement: 65_000_000,
     artifactType: 'archive',
   }
   ```
3. Update `.env`: `VITE_MODEL_TTS_ID=vits-piper-de_DE-thorsten-medium`

---

## 🐛 Troubleshooting

| Problem | Fix |
|---|---|
| WASM fails to load | Ensure COOP/COEP headers are set in dev server |
| Tab crashes on download | Close other browser tabs, use Chrome/Edge |
| Safari issues | Use Chrome or Edge — Safari has limited OPFS support |
| `SharedArrayBuffer is not defined` | Missing COOP/COEP headers — check `vite.config.js` |
| Models not found after page refresh | Normal — they load from OPFS cache automatically |
| `WASM expected magic word` error | Static files are being intercepted — check server routing |

---

## 📄 License

MIT — feel free to use, modify, and deploy.

---

*Built with ❤️ using [RunAnywhere Web SDK](https://docs.runanywhere.ai/web/introduction), React, Vite, Bun, and Tailwind CSS.*
