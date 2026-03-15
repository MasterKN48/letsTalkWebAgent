# 🛠️ Technical Documentation: Let'sTalk.live

This document provides a deep dive into the technical architecture, component design, and state management of the Let'sTalk.live application.

---

## 🏗️ Architectural Overview

Let'sTalk.live is built as a highly modular React application that leverages **Transformers.js (v3)** to perform complex AI tasks entirely on the client side.

### Core Technologies
- **React (Vite)**: UI framework.
- **Zustand**: Centralized state management with DevTools support.
- **Transformers.js v3**: High-performance AI pipeline (WebGPU/WASM).
- **vad-web (Silero VAD)**: Real-time voice activity detection.

---

## 🧩 Component Architecture

The application is decomposed into functional modules located in `src/components/`.

### 1. `App.jsx` (The UI Orchestrator)
The central hub for UI interaction.
- **Responsibility**: Manages the Web Worker lifecycle and handles communication between the VAD and the AI pipeline.
- **Key Logic**: Initializes the `worker.js` and passes configuration via environment variables.

### 2. `src/store/useVoiceStore.js` (State Machine)
Powered by **Zustand**, this store manages:
- Pipeline stages (`listening`, `processing`, `speaking`).
- Transcription history and audio metrics.
- UI preferences (language, dark mode, voice clone).

### 3. `src/worker.js` (The Brain)
A dedicated Web Worker that runs the sequential "Waterfall" pipeline:
- **STT**: Whisper Tiny for rapid transcription.
- **Translation**: OPUS-MT for target language generation.
- **TTS**: Chatterbox with speaker embedding support for voice cloning.
- **WebGPU**: Utilized for TTS and STT whenever available for peak performance.

### 4. `src/utils/audioProcessor.js` (The Ear)
Uses **Silero VAD** via the `vad-web` library.
- **Responsibility**: Monitors the microphone stream and identifies speech segments.
- **Buffering**: Automatically captures audio chunks and triggers the AI pipeline upon speech end.

---

## 📡 State Management & Data Flow

### Pipeline Lifecycle
`idle` → `listening` → `processing` → `generating` → `speaking` → `idle`

### Audio Processing Pipeline
1. **Detection**: VAD identifies speech and returns a `Float32Array` of samples.
2. **Transfer**: Samples are passed to `worker.js`.
3. **STT**: Whisper converts audio to text.
4. **Translation**: Text is translated to the target language.
5. **Synthesis**: TTS generates voice audio.
6. **Playback**: The main thread receives audio buffers and plays them through the UI.

---

## 📦 Data Models

### Transcript Object
```javascript
{
  id: number,          // Unique stable timestamp
  type: 'source' | 'target',
  text: string,        // Final or partial text
  time: string,        // Formatted HH:MM
  audioBlobUrl: string, // Local URL for playback
  isStreaming: boolean // Whether content is still arriving
}
```

---

## 🛠️ Implementation Details

### Model Management
Models are loaded and cached using **Transformers.js** internal mechanisms.
- **Caching**: Models are stored in the browser's Cache Storage or OPFS based on the `.env` configuration.
- **Lazy Loading**: Pipelines and models are initialized only when first needed (at the start of the first processing turn) and are kemudian reused for subsequent turns.
- **Sequential Execution**: The worker ensures that only one pipeline stage (STT, Translation, or TTS) is active at a time to optimize memory usage on lower-end devices.

### Theme & Styling
- **Dark Mode**: Managed via a React state synchronized with the `dark` class on the root element.
- **Animations**: Framer-motion-like transitions are implemented using CSS transitions and Tailwind utility classes for high performance.

---

*For usage metrics and deployment guides, refer back to the [README.md](./README.md).*
