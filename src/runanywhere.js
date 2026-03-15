import {
  RunAnywhere,
  SDKEnvironment,
  ModelManager,
  ModelCategory,
  LLMFramework,
} from "@runanywhere/web";
import { LlamaCPP } from "@runanywhere/web-llamacpp";
import { ONNX } from "@runanywhere/web-onnx";

// Model IDs from .env
const MODEL_IDS = {
  llm: import.meta.env.VITE_MODEL_LLM_ID ?? "lfm2-350m-q4_k_m",
  stt: import.meta.env.VITE_MODEL_STT_ID ?? "sherpa-onnx-whisper-tiny.en",
  tts: import.meta.env.VITE_MODEL_TTS_ID ?? "vits-piper-en_US-lessac-medium",
  vad: import.meta.env.VITE_MODEL_VAD_ID ?? "silero-vad-v5",
};

const MODELS = [
  {
    id: MODEL_IDS.llm,
    name: "LFM2 350M Q4_K_M",
    repo: "LiquidAI/LFM2-350M-GGUF",
    files: ["LFM2-350M-Q4_K_M.gguf"],
    framework: LLMFramework.LlamaCpp,
    modality: ModelCategory.Language,
    memoryRequirement: 250_000_000,
  },
  {
    id: MODEL_IDS.stt,
    name: "Whisper Tiny",
    url: "https://huggingface.co/runanywhere/sherpa-onnx-whisper-tiny.en/resolve/main/sherpa-onnx-whisper-tiny.en.tar.gz",
    framework: LLMFramework.ONNX,
    modality: ModelCategory.SpeechRecognition,
    memoryRequirement: 105_000_000,
    artifactType: "archive",
  },
  {
    id: MODEL_IDS.stt,
    name: "Whisper Tiny ONNX",
    url: "https://huggingface.co/onnx-community/whisper-tiny-ONNX/resolve/main/whisper-tiny-ONNX.tar.gz",
    framework: LLMFramework.ONNX,
    modality: ModelCategory.SpeechRecognition,
    memoryRequirement: 105_000_000,
    artifactType: "archive",
  },
  {
    id: MODEL_IDS.tts,
    name: "Piper TTS EN Lessac",
    url: "https://huggingface.co/runanywhere/vits-piper-en_US-lessac-medium/resolve/main/vits-piper-en_US-lessac-medium.tar.gz",
    framework: LLMFramework.ONNX,
    modality: ModelCategory.SpeechSynthesis,
    memoryRequirement: 65_000_000,
    artifactType: "archive",
  },
  {
    id: MODEL_IDS.vad,
    name: "Silero VAD v5",
    url: "https://huggingface.co/runanywhere/silero-vad-v5/resolve/main/silero_vad.onnx",
    files: ["silero_vad.onnx"],
    framework: LLMFramework.ONNX,
    modality: ModelCategory.Audio,
    memoryRequirement: 5_000_000,
  },
];

// Idempotent init — safe to call multiple times
let _initPromise = null;

export async function initSDK() {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    await RunAnywhere.initialize({
      environment: SDKEnvironment.Development,
      debug: false,
      telemetry: false,
      acceleration: "webgpu",
    });
    await LlamaCPP.register();
    await ONNX.register();
    RunAnywhere.registerModels(MODELS);
  })();
  return _initPromise;
}

export { ModelManager, ModelCategory, MODEL_IDS };
