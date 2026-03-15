# 🛠️ Technical Documentation: Let'sTalk.live

This document provides a deep dive into the technical architecture, component design, and state management of the Let'sTalk.live application.

---

## 🏗️ Architectural Overview

Let'sTalk.live is built as a highly modular React application that leverages the **RunAnywhere Web SDK** to perform complex AI tasks entirely on the client side.

### Core Technologies
- **React (Vite)**: UI orchestration and state management.
- **Tailwind CSS**: Modern, responsive styling with dark mode support.
- **RunAnywhere Web SDK**: High-level API for voice processing.
- **WASM Backends**: 
  - `llamacpp`: High-performance LLM execution.
  - `sherpa-onnx`: Fast STT, TTS, and VAD processing.

---

## 🧩 Component Architecture

The application is decomposed into functional modules located in `src/components/`.

### 1. `App.jsx` (The Orchestrator)
The central hub for data flow. 
- **Responsibility**: Manages global UI state (pipeline stage, transcripts, metrics) and initializes the SDK.
- **Key Logic**: Orchestrates the `processAudioSamples` callback which triggers the sequential STT → LLM → TTS pipeline turn.

### 2. `RecordingHub.jsx`
The primary user interaction point.
- **Props**: Audio levels, pipeline stage, error messages, and action callbacks.
- **Features**: 
  - Adaptive microphone ring animation based on volume.
  - Drag-and-drop / File upload integration.
  - Informative status labels for every pipeline tick.

### 3. `ConfigPanel.jsx`
Global settings management.
- **Responsibility**: Allows users to select languages and toggle voice cloning.
- **Performance**: Displays real-time download percentages for each model category.

### 4. `SourceTranscript.jsx` & `TranslatedAudio.jsx`
The feed components.
- **Source**: Shows raw transcription with a simple play-back for verification.
- **Translated**: Displays the LLM output (streaming supported) and provides a progress-tracked audio player for the synthesized speech.

### 5. `CustomAudioPlayer.jsx`
A reusable, premium audio component.
- **UI**: Includes a seekable progress bar, play/pause controls, and duration display.
- **Compatibility**: Works with standard browser Blobs generated from the WASM pipeline.

---

## 📡 State Management & Data Flow

### Pipeline Lifecycle
The application state follows a strict machine:
`idle` → `sdk_init` → `downloading` → `loading` → `listening` → `processing` → `generating` → `speaking` → `idle`

### Audio Processing Pipeline
1. **Capture**: `AudioCapture` collects chunks at 16kHz.
2. **Detection**: `VAD` (Voice Activity Detection) monitors chunks and triggers `Ended` activity when silence is detected.
3. **Encoding**: `utils/audio.js` converts raw samples to a WAV Blob for immediate UI feedback.
4. **Turn Execution**: `VoicePipeline.processTurn` runs the multi-stage AI process.
5. **Streaming**: LLM tokens are pushed back to the UI in real-time via `onResponseToken`.
6. **Synthesis**: TTS audio is received as a `Float32Array`, converted to a Blob, and mapped to the corresponding transcript ID.

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
Models are registered in `runanywhere.js`. The `ensureModelLoaded` utility in `App.jsx` ensures that models are only downloaded if missing and only loaded if not already in memory, optimizing for both speed and resource usage.

### Theme & Styling
- **Dark Mode**: Managed via a React state synchronized with the `dark` class on the root element.
- **Animations**: Framer-motion-like transitions are implemented using CSS transitions and Tailwind utility classes for high performance.

---

*For usage metrics and deployment guides, refer back to the [README.md](./README.md).*
