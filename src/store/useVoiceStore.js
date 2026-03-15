import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useVoiceStore = create(
  devtools((set) => ({
    // UI State
    darkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
    sourceLang: "en",
    targetLang: "hi",
    voiceClone: true,
    stage: "idle",
    audioLevel: 0,
    downloadPct: {}, // { modelId: 0-100 }
    transcripts: [], // { id, type, text, time, audioBlobUrl, isStreaming }
    metrics: { latency: "--", accuracy: "--", speed: "--" },
    error: null,
    uploadedFileName: null,

    // Actions
    setDarkMode: (darkMode) => {
      set({ darkMode }, false, "setDarkMode");
      document.documentElement.classList.toggle("dark", darkMode);
    },
    setSourceLang: (sourceLang) => set({ sourceLang }, false, "setSourceLang"),
    setTargetLang: (targetLang) => set({ targetLang }, false, "setTargetLang"),
    setVoiceClone: (voiceClone) => set({ voiceClone }, false, "setVoiceClone"),
    setStage: (stage) => set({ stage }, false, "setStage"),
    setAudioLevel: (audioLevel) => set({ audioLevel }, false, "setAudioLevel"),
    setDownloadPct: (modelId, pct) =>
      set(
        (state) => ({
          downloadPct: { ...state.downloadPct, [modelId]: pct },
        }),
        false,
        "setDownloadPct"
      ),
    addTranscript: (transcript) =>
      set(
        (state) => ({
          transcripts: [...state.transcripts, transcript],
        }),
        false,
        "addTranscript"
      ),
    updateTranscript: (id, updates) =>
      set(
        (state) => ({
          transcripts: state.transcripts.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        }),
        false,
        "updateTranscript"
      ),
    clearTranscripts: () =>
      set(
        {
          transcripts: [],
          metrics: { latency: "--", accuracy: "--", speed: "--" },
        },
        false,
        "clearTranscripts"
      ),
    setMetrics: (metrics) => set({ metrics }, false, "setMetrics"),
    setError: (error) => set({ error }, false, "setError"),
    setUploadedFileName: (uploadedFileName) =>
      set({ uploadedFileName }, false, "setUploadedFileName"),

    // Reset
    reset: () =>
      set(
        {
          stage: "idle",
          audioLevel: 0,
          error: null,
          uploadedFileName: null,
        },
        false,
        "reset"
    ),
  }), { name: "VoiceStore", enabled: import.meta.env.DEV })
);
