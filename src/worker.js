import { pipeline, env } from "@huggingface/transformers";

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

self.onmessage = async (e) => {
  const { type, audio, src, tgt } = e.data;

  if (type === "process") {
    try {
      // 1. STT (Whisper)
      self.postMessage({
        type: "status",
        status: "processing",
        message: "Transcribing speech...",
      });
      stt ??= await pipeline("automatic-speech-recognition", config.STT_ID, {
        device: "wasm",
        quantized: true,
      });

      const startSTT = Date.now();
      const { text } = await stt(audio, {
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
      const modelId = `${config.TRANSLATION_PREFIX}-${src}-${tgt}`;
      if (!translator || translator.model_id !== modelId) {
        translator = await pipeline("translation", modelId, {
          device: "wasm",
          quantized: true,
        });
      }

      const startTrans = Date.now();
      const [{ translation_text }] = await translator(text);
      const latencyTrans = Date.now() - startTrans;
      self.postMessage({
        type: "text_tgt",
        text: translation_text,
        latency: latencyTrans,
      });

      // 3. TTS (Chatterbox)
      self.postMessage({
        type: "status",
        status: "speaking",
        message: "Synthesizing voice...",
      });
      tts ??= await pipeline("text-to-speech", config.TTS_ID, {
        dtype: "q4",
        device: "webgpu",
      }).catch(() =>
        pipeline("text-to-speech", config.TTS_ID, {
          dtype: "q4",
          device: "wasm",
        }),
      );

      const startTTS = Date.now();
      // Voice cloning happens here by passing original audio as speaker_embeddings
      const speech = await tts(translation_text, {
        speaker_embeddings: audio,
        language: tgt,
      });
      const latencyTTS = Date.now() - startTTS;

      self.postMessage({
        type: "audio",
        audio: speech.audio,
        sr: speech.sampling_rate,
        latency: latencyTTS,
        totalLatency: Date.now() - startSTT,
      });

      self.postMessage({ type: "status", status: "idle" });
    } catch (error) {
      console.error("Worker error:", error);
      self.postMessage({ type: "error", error: error.message });
    }
  }
};
