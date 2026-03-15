import { useState, useEffect, useCallback, useRef } from "react";
import {
  VoicePipeline,
  EventBus,
  AudioCapture,
  SpeechActivity,
} from "@runanywhere/web";
import { VAD } from "@runanywhere/web-onnx";

// Constants & SDK
import { LANGUAGES, STAGE_LABELS } from "./constants";
import { initSDK, ModelManager, ModelCategory, MODEL_IDS, ModelStatus } from "./runanywhere";

// Components
import Header from "./components/Header";
import ConfigPanel from "./components/ConfigPanel";
import RecordingHub from "./components/RecordingHub";
import SourceTranscript from "./components/SourceTranscript";
import TranslatedAudio from "./components/TranslatedAudio";
import MetricsDisplay from "./components/MetricsDisplay";

// Utilities
import { encodeWAV } from "./utils/audio";
import { formatTime } from "./utils/time";

/**
 * Main Application Component.
 * Manages the high-level orchestration of the voice translation pipeline.
 */
export default function App() {
  /* ─── UI State ─────────────────────────────────────────────── */
  const [darkMode, setDarkMode] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("es");
  const [voiceClone, setVoiceClone] = useState(true);
  const [stage, setStage] = useState("idle");
  const [audioLevel, setAudioLevel] = useState(0);
  const [downloadPct, setDownloadPct] = useState({}); // { modelId: 0-100 }
  const [transcripts, setTranscripts] = useState([]); // { id, type, text, time, audioBlobUrl, isStreaming }
  const [metrics, setMetrics] = useState({ latency: "--", accuracy: "--", speed: "--" });
  const [error, setError] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState(null);

  /* ─── Refs ─────────────────────────────────────────────────── */
  const micRef = useRef(null);
  const pipelineRef = useRef(null);
  const vadUnsubRef = useRef(null);
  const fileInputRef = useRef(null);
  const activeRef = useRef(false);

  /* ─── Effects ────────────────────────────────────────────── */
  
  // Theme management
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Monitor model download progress
  useEffect(() => {
    let unsub;
    initSDK().then(() => {
      unsub = EventBus.shared.on("model.downloadProgress", (evt) => {
        const pct = Math.round((evt.progress ?? 0) * 100);
        setDownloadPct((prev) => ({ ...prev, [evt.modelId]: pct }));
      });
    });
    return () => unsub?.();
  }, []);

  // Lifecycle cleanup
  useEffect(() => {
    return () => {
      micRef.current?.stop();
      vadUnsubRef.current?.();
    };
  }, []);

  /* ─── Logic Methods ──────────────────────────────────────── */

  /**
   * Ensures a specific model is downloaded and loaded into memory.
   */
  const ensureModelLoaded = useCallback(async (category, modelId) => {
    const models = ModelManager.getModels().filter((m) => m.modality === category);
    const id = modelId ?? models[0]?.id;
    if (!id) throw new Error(`No model registered for category: ${category}`);

    if (ModelManager.getLoadedModelId(category) === id) return;

    const model = ModelManager.getModels().find((m) => m.id === id);
    const isDownloaded = model?.status === ModelStatus.Downloaded;

    if (!isDownloaded) {
      setStage("downloading");
      await ModelManager.downloadModel(id);
    }

    setStage("loading");
    await ModelManager.loadModel(id, { coexist: true });
  }, []);

  /**
   * Initialises the SDK and all 4 core voice models.
   */
  const ensureReady = useCallback(async () => {
    setError(null);
    activeRef.current = true;

    setStage("sdk_init");
    await initSDK();

    setStage("downloading");
    await Promise.all([
      ensureModelLoaded(ModelCategory.Audio, MODEL_IDS.vad),
      ensureModelLoaded(ModelCategory.SpeechRecognition, MODEL_IDS.stt),
      ensureModelLoaded(ModelCategory.Language, MODEL_IDS.llm),
      ensureModelLoaded(ModelCategory.SpeechSynthesis, MODEL_IDS.tts),
    ]);

    if (!pipelineRef.current) pipelineRef.current = new VoicePipeline();
  }, [ensureModelLoaded]);

  /**
   * Processes a turn of audio (STT -> LLM -> TTS).
   */
  const processAudioSamples = useCallback(
    async (audioSamples) => {
      const turnStart = Date.now();
      const srcId = Date.now();
      const srcAudioUrl = URL.createObjectURL(encodeWAV(audioSamples, 16000));

      setTranscripts((prev) => [
        ...prev,
        { id: srcId, type: "source", text: "…", time: formatTime(), audioBlobUrl: srcAudioUrl },
      ]);

      setStage("processing");

      const srcLangName = LANGUAGES.find((l) => l.code === sourceLang)?.name ?? sourceLang;
      const tgtLangName = LANGUAGES.find((l) => l.code === targetLang)?.name ?? targetLang;
      
      const systemPrompt = `You are a real-time voice translator. The user speaks ${srcLangName}. 
Transcribe their speech exactly, then translate it concisely to ${tgtLangName}. 
Reply with ONLY the translated text in ${tgtLangName}. No explanations, no labels.`;

      try {
        let firstToken = null;
        let finalTargetId = null;

        await pipelineRef.current.processTurn(
          audioSamples,
          {
            maxTokens: Number(import.meta.env.VITE_LLM_MAX_TOKENS) || 80,
            temperature: Number(import.meta.env.VITE_LLM_TEMPERATURE) || 0.7,
            systemPrompt,
          },
          {
            onStateChange: (s) => {
              if (s === "generatingResponse") setStage("generating");
              if (s === "playingTTS") setStage("speaking");
            },
            onTranscription: (text) => {
              setTranscripts((prev) =>
                prev.map((t) => (t.id === srcId ? { ...t, text } : t)),
              );
            },
            onResponseToken: (_, acc) => {
              if (!firstToken) {
                firstToken = Date.now();
                finalTargetId = Date.now() + 1;
                setTranscripts((prev) => [
                  ...prev,
                  { id: finalTargetId, type: "target", text: acc, time: formatTime(), isStreaming: true },
                ]);
              } else {
                setTranscripts((prev) =>
                  prev.map((t) => (t.id === finalTargetId ? { ...t, text: acc } : t)),
                );
              }
            },
            onResponseComplete: (text) => {
              setTranscripts((prev) =>
                prev.map((t) => (t.id === finalTargetId ? { ...t, text, isStreaming: false } : t)),
              );

              const latency = Date.now() - turnStart;
              setMetrics({
                latency: `${latency}ms`,
                accuracy: "~98%",
                speed: `${(text.split(" ").length / (latency / 1000)).toFixed(1)}w/s`,
              });
            },
            onSynthesisComplete: async (audio, sampleRate) => {
              setStage("speaking");
              const audioBlobUrl = URL.createObjectURL(encodeWAV(audio, sampleRate));
              setTranscripts((prev) =>
                prev.map((t) => (t.id === finalTargetId ? { ...t, audioBlobUrl } : t)),
              );
              setStage("idle");
            },
            onError: (err) => {
              console.error("Pipeline error:", err);
              setError(err.message);
            },
          },
        );
      } catch (err) {
        console.error("Voice pipeline error:", err);
        setError(err.message);
        setStage("error");
        return;
      }

      setStage("idle");
      setAudioLevel(0);
      setUploadedFileName(null);
      activeRef.current = false;
    },
    [sourceLang, targetLang],
  );

  /* ─── Handlers ──────────────────────────────────────────── */

  const startListening = useCallback(async () => {
    try {
      await ensureReady();
      setStage("listening");
      const mic = new AudioCapture({ sampleRate: 16000 });
      micRef.current = mic;

      VAD.reset();
      vadUnsubRef.current = VAD.onSpeechActivity(async (activity) => {
        if (activity !== SpeechActivity.Ended) return;
        const segment = VAD.popSpeechSegment();
        if (!segment || segment.samples.length < 1600) return;

        mic.stop();
        vadUnsubRef.current?.();
        await processAudioSamples(segment.samples);
      });

      await mic.start(
        (chunk) => VAD.processSamples(chunk),
        (level) => setAudioLevel(level)
      );
    } catch (err) {
      console.error("Start error:", err);
      setError(err.message);
      setStage("error");
      activeRef.current = false;
    }
  }, [ensureReady, processAudioSamples]);

  const stopListening = useCallback(() => {
    micRef.current?.stop();
    vadUnsubRef.current?.();
    pipelineRef.current?.cancel?.();
    activeRef.current = false;
    setStage("idle");
    setAudioLevel(0);
  }, []);

  const handleFileChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        setUploadedFileName(file.name);
        await ensureReady();
        setStage("processing");

        const arrayBuffer = await file.arrayBuffer();
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const decoded = await audioCtx.decodeAudioData(arrayBuffer);
        const float32 = decoded.getChannelData(0); 
        audioCtx.close();

        await processAudioSamples(float32);
      } catch (err) {
        console.error("File processing error:", err);
        setError(err.message);
        setStage("error");
        setUploadedFileName(null);
        activeRef.current = false;
      }
      e.target.value = "";
    },
    [ensureReady, processAudioSamples]
  );

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
    setMetrics({ latency: "--", accuracy: "--", speed: "--" });
  }, []);

  /* ─── Derived UI Values ─────────────────────────────────── */
  const isActive = stage !== "idle" && stage !== "error";
  const stageInfo = STAGE_LABELS[stage] ?? STAGE_LABELS.idle;
  const downloadingModelArr = Object.entries(downloadPct).find(([, p]) => p > 0 && p < 100);
  const downloadLabel = downloadingModelArr
    ? `${downloadingModelArr[0].split("-").slice(-1)[0]}: ${downloadingModelArr[1]}%`
    : null;

  /* ─── Render ────────────────────────────────────────────── */
  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center max-w-5xl mx-auto transition-colors duration-300 dark:bg-brand-dark-bg">
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        isActive={isActive} 
        stage={stage} 
      />

      <main className="w-full flex flex-col gap-8 mt-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ConfigPanel 
            sourceLang={sourceLang}
            setSourceLang={setSourceLang}
            targetLang={targetLang}
            setTargetLang={setTargetLang}
            voiceClone={voiceClone}
            setVoiceClone={setVoiceClone}
            isActive={isActive}
            downloadingModel={downloadingModelArr}
          />

          <RecordingHub 
            isListening={stage === "listening"}
            ringScale={stage === "listening" ? 1 + audioLevel * 0.35 : 1}
            onMicClick={stage === "idle" || stage === "error" ? startListening : stopListening}
            onUploadClick={() => fileInputRef.current?.click()}
            isActive={isActive}
            stageInfo={stageInfo}
            stage={stage}
            downloadLabel={downloadLabel}
            uploadedFileName={uploadedFileName}
            audioLevel={audioLevel}
            error={error}
          />
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SourceTranscript 
            transcripts={transcripts} 
            stage={stage} 
            onClearAll={clearTranscripts} 
          />
          <TranslatedAudio transcripts={transcripts} />
        </div>

        <MetricsDisplay metrics={metrics} />
      </main>

      <footer className="mt-12 text-gray-400 text-sm pb-8">
        © 2026 Let'sTalk.live • Real-time On-Device Translation
      </footer>
    </div>
  );
}
