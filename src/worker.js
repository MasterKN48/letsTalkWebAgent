import {
  pipeline,
  env,
  AutoModel,
  AutoTokenizer,
  PretrainedConfig,
} from "@huggingface/transformers";

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

let stt, translator, ttsModel, ttsTokenizer;

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
      console.log("Starting STT...", config.STT_ID);
      stt ??= await pipeline("automatic-speech-recognition", config.STT_ID, {
        device: "wasm",
        quantized: true,
      });
      console.log("STT model loaded.");

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

      // 3. TTS (Chatterbox)
      self.postMessage({
        type: "status",
        status: "speaking",
        message: "Synthesizing voice...",
      });

      if (!ttsModel || !ttsTokenizer) {
        console.log("Loading TTS model...");
        // 3. Create a manual config to satisfy the loader
        const customConfig = new PretrainedConfig({
          model_type: "llama", // Chatterbox is built on a 0.5B Llama-based architecture
          is_encoder_decoder: false,
        });
        // console.log("Loading TTS model...", customConfig);
        ttsTokenizer = await AutoTokenizer.from_pretrained(config.TTS_ID);
        ttsModel = await AutoModel.from_pretrained(config.TTS_ID, {
          config: customConfig,
          model_file_name: "language_model_q4f16", // Targets the Q4 file directly
          quantized: false,
          device: "webgpu",
          dtype: "fp32",
          use_external_data_format: true,
        }).catch(() =>
          AutoModel.from_pretrained(config.TTS_ID, {
            config: customConfig,
            model_file_name: "language_model_q4f16", // Targets the Q4 file directly
            quantized: false,
            device: "wasm",
            dtype: "fp32",
            use_external_data_format: true,
          }),
        );
        console.log("TTS model loaded.", ttsModel, ttsTokenizer);
      }

      const startTTS = Date.now();

      // Chatterbox expects a specific prompt format for cloning
      const inputs = await ttsTokenizer(translation_text);

      // Generate with speaker embeddings
      const output = await ttsModel.generate({
        ...inputs,
        speaker_embeddings: audio, // Original 5s Float32Array
        language: tgt,
        max_new_tokens: 256, // Limit the "thinking" time
        min_new_tokens: 10, // Prevents empty/too-short outputs
        do_sample: false, // Use greedy decoding for consistency faster than sampling
        early_stopping: true, // Stop when EOS token is generated
      });

      const latencyTTS = Date.now() - startTTS;

      self.postMessage({
        type: "audio",
        audio: output.audio,
        sr: output.sampling_rate,
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
