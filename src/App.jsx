import { useEffect, useCallback, useRef } from "react";

// Store
import { useVoiceStore } from "./store/useVoiceStore";

// Constants
import { STAGE_LABELS } from "./constants";

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
import { AudioProcessor } from "./utils/audioProcessor";

/**
 * Main Application Component.
 * Manages the high-level orchestration of the voice translation pipeline using Transformer.js.
 */
export default function App() {
  const {
    darkMode,
    setDarkMode,
    sourceLang,
    setSourceLang,
    targetLang,
    setTargetLang,
    voiceClone,
    setVoiceClone,
    stage,
    setStage,
    audioLevel,
    setAudioLevel,
    downloadPct,
    transcripts,
    addTranscript,
    updateTranscript,
    clearTranscripts,
    metrics,
    setMetrics,
    error,
    setError,
    uploadedFileName,
    setUploadedFileName,
  } = useVoiceStore();

  /* ─── Refs ─────────────────────────────────────────────────── */
  const workerRef = useRef(null);
  const processorRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastSourceIdRef = useRef(null);
  const lastTargetIdRef = useRef(null);

  /* ─── Effects ────────────────────────────────────────────── */

  // Theme management
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Initialize Worker
  useEffect(() => {
    workerRef.current = new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
    });

    workerRef.current.onmessage = (e) => {
      const {
        type,
        text,
        audio,
        sr,
        status,
        error: workerError,
        totalLatency,
      } = e.data;
      console.log("Worker message:", e.data);
      if (type === "status") {
        setStage(status);
      } else if (type === "text_src") {
        const id = lastSourceIdRef.current;
        if (id) {
          updateTranscript(id, { text });
        }
      } else if (type === "text_tgt") {
        const id = Date.now();
        lastTargetIdRef.current = id;
        addTranscript({
          id,
          type: "target",
          text,
          time: formatTime(),
          isStreaming: false,
        });
      } else if (type === "audio") {
        const id = lastTargetIdRef.current;
        if (id) {
          const audioBlobUrl = URL.createObjectURL(encodeWAV(audio, sr));
          updateTranscript(id, { audioBlobUrl });
        }
        if (totalLatency) {
          setMetrics({
            latency: `${totalLatency}ms`,
            accuracy: "~98%",
            speed: `${metrics.speed}`, // Keep previous or calculate anew
          });
        }
      } else if (type === "error") {
        console.error("Worker error:", workerError);
        setError(workerError);
        setStage("error");
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [
    addTranscript,
    updateTranscript,
    setStage,
    setError,
    setMetrics,
    metrics.speed,
  ]);

  // Initialize Audio Processor
  useEffect(() => {
    processorRef.current = new AudioProcessor({
      onSpeechStart: () => {
        const id = Date.now();
        lastSourceIdRef.current = id;
        // Placeholder for source transcript
        addTranscript({
          id,
          type: "source",
          text: "...",
          time: formatTime(),
          audioBlobUrl: null,
        });
        setStage("recording");
      },
      onSpeechEnd: (audio) => {
        // Send to worker
        setStage("processing");
        workerRef.current.postMessage({
          type: "process",
          audio,
          src: sourceLang,
          tgt: targetLang,
        });

        // Update source transcript with audio blob
        const id = lastSourceIdRef.current;
        if (id) {
          const audioBlobUrl = URL.createObjectURL(encodeWAV(audio, 16000));
          updateTranscript(id, { audioBlobUrl });
        }
      },
      onFrameProcessed: (level) => {
        setAudioLevel(level);
      },
    });

    return () => {
      processorRef.current?.destroy();
    };
  }, [
    addTranscript,
    updateTranscript,
    setStage,
    setAudioLevel,
    sourceLang,
    targetLang,
  ]);

  /* ─── Handlers ──────────────────────────────────────────── */

  const startListening = useCallback(async () => {
    try {
      setError(null);
      setStage("listening");
      await processorRef.current.start();
    } catch (err) {
      console.error("Start error:", err);
      setError(err.message);
      setStage("error");
    }
  }, [setError, setStage]);

  const stopListening = useCallback(() => {
    processorRef.current?.stop();
    setStage("idle");
    setAudioLevel(0);
  }, [setStage, setAudioLevel]);

  const handleFileChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        setUploadedFileName(file.name);
        setStage("processing");

        const arrayBuffer = await file.arrayBuffer();
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)(
          { sampleRate: 16000 },
        );
        const decoded = await audioCtx.decodeAudioData(arrayBuffer);
        const float32 = decoded.getChannelData(0);
        audioCtx.close();

        const id = Date.now();
        lastSourceIdRef.current = id;
        addTranscript({
          id,
          type: "source",
          text: "...",
          time: formatTime(),
          audioBlobUrl: URL.createObjectURL(file),
        });

        workerRef.current.postMessage({
          type: "process",
          audio: float32,
          src: sourceLang,
          tgt: targetLang,
        });
      } catch (err) {
        console.error("File processing error:", err);
        setError(err.message);
        setStage("error");
        setUploadedFileName(null);
      }
      e.target.value = "";
    },
    [
      sourceLang,
      targetLang,
      addTranscript,
      setError,
      setStage,
      setUploadedFileName,
    ],
  );

  /* ─── Derived UI Values ─────────────────────────────────── */
  const isActive = stage !== "idle" && stage !== "error";
  const stageInfo = STAGE_LABELS[stage] ?? STAGE_LABELS.idle;
  const downloadingModelArr = Object.entries(downloadPct).find(
    ([, p]) => p > 0 && p < 100,
  );
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
            isListening={stage === "listening" || stage === "recording"}
            ringScale={
              stage === "listening" || stage === "recording"
                ? 1 + audioLevel * 0.35
                : 1
            }
            onMicClick={
              stage === "idle" || stage === "error"
                ? startListening
                : stopListening
            }
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
