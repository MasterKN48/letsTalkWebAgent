import { pipeline, env } from "@huggingface/transformers";
import { KokoroTTS } from "kokoro-js";

const config = {
  STT_ID: import.meta.env.VITE_MODEL_STT_ID,
  TTS_ID: import.meta.env.VITE_MODEL_TTS_ID,
  TRANSLATION_PREFIX: import.meta.env.VITE_TRANSLATION_PREFIX,
  USE_CACHE: import.meta.env.VITE_USE_CACHE === "true",
  USE_OPFS: import.meta.env.VITE_USE_OPFS === "true",
};

// Configuration for web environment
env.allowLocalModels = false;
env.useBrowserCache = config.USE_CACHE;

let stt, translator, tts;
let streamingBuffer = new Float32Array(0);

// Helper to concatenate Float32Arrays
function concatFloat32Arrays(a, b) {
  const result = new Float32Array(a.length + b.length);
  result.set(a);
  result.set(b, a.length);
  return result;
}

self.onmessage = async (e) => {
  const { type, audio, src, tgt } = e.data;

  if (type === "reset_stream") {
    streamingBuffer = new Float32Array(0);
    self.postMessage({ type: "status", status: "idle" });
    return;
  }

  if (type === "stream") {
    if (!audio) return;
    streamingBuffer = concatFloat32Arrays(streamingBuffer, audio);

    try {
      stt ??= await pipeline("automatic-speech-recognition", config.STT_ID, {
        device: "wasm",
        quantized: true,
      });

      // Run STT on the current buffer
      const { text } = await stt(streamingBuffer, {
        language: src,
        task: "transcribe",
      });

      if (text && text.trim().length > 0) {
        self.postMessage({ type: "text_src_partial", text });

        // Optional: Incremental translation
        const modelId = `${config.TRANSLATION_PREFIX}-${src}-${tgt}`;
        if (!translator || translator.model_id !== modelId) {
          translator = await pipeline("translation", modelId, {
            device: "wasm",
            quantized: true,
          });
        }
        const [{ translation_text }] = await translator(text);
        self.postMessage({ type: "text_tgt_partial", text: translation_text });
      }
    } catch (err) {
      console.error("Streaming error:", err);
    }
  }

  if (type === "process") {
    try {
      const finalAudio = audio || streamingBuffer;
      // 1. STT (Whisper)
      self.postMessage({
        type: "status",
        status: "processing",
        message: "Finalizing transcription...",
      });
      console.log("Starting STT...", config.STT_ID);
      stt ??= await pipeline("automatic-speech-recognition", config.STT_ID, {
        device: "wasm",
        quantized: true,
      });
      console.log("STT model loaded.");

      const startSTT = Date.now();
      const { text } = await stt(finalAudio, {
        language: src,
        task: "transcribe",
      });
      const latencySTT = Date.now() - startSTT;
      self.postMessage({ type: "text_src", text, latency: latencySTT });

      if (!text || text.trim().length === 0) {
        self.postMessage({ type: "status", status: "idle" });
        return;
      }

      // 2. Translation (OPUS-MT)
      self.postMessage({
        type: "status",
        status: "generating",
        message: "Translating...",
      });

      const modelId = `${config.TRANSLATION_PREFIX}-${src}-${tgt === "ja" ? "jap" : tgt}`;
      console.log("Loading translator...", modelId);
      if (!translator || translator.model_id !== modelId) {
        translator = await pipeline("translation", modelId, {
          device: "wasm",
          quantized: true,
        });
      }
      console.log("Translator loaded.");

      const startTrans = Date.now();
      const [{ translation_text }] = await translator(text);
      const latencyTrans = Date.now() - startTrans;
      self.postMessage({
        type: "text_tgt",
        text: translation_text,
        latency: latencyTrans,
      });

      // 3. TTS (KokoroTTS)
      self.postMessage({
        type: "status",
        status: "speaking",
        message: "Synthesizing voice...",
      });

      if (!tts) {
        console.log("Loading KokoroTTS model...");
        tts = await KokoroTTS.from_pretrained(config.TTS_ID, {
          dtype: "q8",
          device: "webgpu",
        });
        console.log("KokoroTTS model loaded.");
      }

      const startTTS = Date.now();

      // Dynamic Kokoro language selection (using a single global voice: af_heart)
      const langMap = {
        en: "a", // English (American)
        hi: "h", // Hindi
        fr: "f", // French
        es: "e", // Spanish
        ja: "j", // Japanese
        zh: "z", // Mandarin Chinese
        pt: "p", // Portuguese (Brazilian)
        it: "i", // Italian
      };

      const voice = "af_heart";
      const lang = langMap[tgt] || "a";

      console.log(
        `Using Kokoro voice: ${voice}, lang: ${lang} for language: ${tgt}`,
      );

      const ttsOutput = await tts.generate(translation_text, { voice, lang });
      const latencyTTS = Date.now() - startTTS;

      self.postMessage({
        type: "audio",
        audio: ttsOutput.audio,
        sr: ttsOutput.sampling_rate,
        latency: latencyTTS,
        totalLatency: Date.now() - startSTT,
      });

      self.postMessage({ type: "status", status: "idle" });
      // Reset after full process
      streamingBuffer = new Float32Array(0);
    } catch (error) {
      console.error("Worker error:", error);
      self.postMessage({ type: "error", error: error.message });
    }
  }
};
