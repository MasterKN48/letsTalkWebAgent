# 🌐 Let'sTalk.live

**[🔴 Live Demo](https://MasterKN48.github.io/letsTalkWebAgent/)**

> Real-time AI voice translation with on-device speech-to-text, LLM translation, and neural text-to-speech — running entirely in your browser via WebAssembly. No server, no API key, full privacy.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🎙️ Live voice recording | Silero VAD detects when you start and stop speaking |
| 👂 On-device STT | Whisper Tiny (Transformers.js v3 WASM/WebGPU) |
| 🧠 On-device Translation | OPUS-MT (Transformers.js v3 WASM) |
| 🔊 On-device TTS | Chatterbox (Transformers.js v3 WebGPU/WASM) |
| 🌍 Language selector | English, Hindi, Spanish, French, German (vice-versa) |
| 🎭 Voice clone | Enable cloning via speaker embeddings |
| 📊 Live metrics | Real-time latency tracking for each stage |
| 🌙 Dark / Light mode | System-aware toggle |
| 📱 PWA | Installable on mobile & desktop |
| ⚡ Vite + Bun | Sub-200ms builds, fast HMR |

---

## 🏗️ Architecture

```
User speaks
    │
    ▼
Audio Processing (vad-web + Silero VAD)
    │
    ▼
Waterfall Pipeline (src/worker.js)
    │
    ├── STT  ——→ Whisper Tiny ——→ transcript text
    │
    ├── Brain ——→ OPUS-MT ——→ translation 
    │
    └── Voice ——→ Chatterbox  ——→ synthesized audio (with cloning)
```

All models run in-browser using **Transformers.js v3**. The pipeline is sequential ("Waterfall") to maximize speed and minimize memory footprint. Voice cloning is achieved by passing the original speaker's embeddings to the TTS model.

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

> ⚠️ **First run**: The app will download ~800 MB of AI models. These are cached in your browser's Cache Storage or OPFS (configurable via `.env`) for instant subsequent loads. WebGPU is highly recommended for real-time TTS performance.

---

## 📁 Project Structure

```
WebVoiceAgent/
├── public/                  # PWA icons & manifest
├── src/
│   ├── components/          # Reusable UI components
│   ├── store/
│   │   └── useVoiceStore.js # Zustand state management
│   ├── utils/
│   │   ├── audio.js         # WAV encoding
│   │   └── audioProcessor.js # VAD & audio chunking logic
│   ├── App.jsx              # UI orchestrator
│   ├── worker.js            # Sequential AI pipeline (Transformers.js)
│   ├── constants.js         # Supported languages & labels
│   ├── index.css            # Styles & Brand tokens
│   └── main.jsx             # React entry point
├── .env                     # Model IDs & Storage settings
└── vite.config.js           # Vite + PWA + Worker config
```

---

## ⚙️ Environment Variables (`.env`)

All model IDs and LLM settings live in `.env`. Change these to swap models without touching code.

```env
# Transformers.js Model IDs
VITE_MODEL_VAD_ID=huggingworld/silero-vad
VITE_MODEL_STT_ID=Xenova/whisper-tiny
VITE_MODEL_TTS_ID=onnx-community/chatterbox-multilingual-ONNX
VITE_TRANSLATION_PREFIX=Xenova/opus-mt

# Storage Backend
VITE_USE_CACHE=true
VITE_USE_OPFS=false
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

### `src/App.jsx` — Orchestration

The main `App` component acts as the central state machine and orchestrator. It uses specific components from `src/components` to keep the UI modular and clean.

| Stage | Meaning |
|---|---|
| `idle` | Waiting for user to tap mic |
| `sdk_init` | Initialising WASM backends |
| `downloading` | Downloading model files (cached in OPFS) |
| `loading` | Loading models into memory |
| `listening` | Mic active, VAD processing audio |
| `processing` | Speech segment detected, running STT |
| `generating` | LLM generating translation |
| `speaking` | TTS audio playing |
| `error` | Error state shown in RecordingHub |

### `src/components/` — UI Modules

The UI is broken down into small, focused components:

- **`RecordingHub`**: Handles microphone capture, file uploads, and status animations.
- **`SourceTranscript`**: Manages the list of source speech with quick playback.
- **`TranslatedAudio`**: Displays translated text and handles the target audio playback with a progress bar.
- **`ConfigPanel`**: Manages source/target languages and voice cloning preferences.
- **`CustomAudioPlayer`**: A premium audio interaction module used for both source and target playback.
- **`MetricsDisplay`**: Displays latency, accuracy, and speed at a glance.

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
| `react` | UI framework |
| `@huggingface/transformers` | AI pipeline (STT, Translation, TTS) |
| `@ricky0123/vad-web` | Silero VAD implementation |
| `zustand` | State management |
| `vite` | Build tool & Dev server |
| `tailwind-css` | Styling |

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
