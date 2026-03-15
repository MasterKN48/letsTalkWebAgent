export const LANGUAGES = [
  { code: 'en', name: 'English', emoji: '🇺🇸' },
  { code: 'es', name: 'Spanish', emoji: '🇪🇸' },
  { code: 'fr', name: 'French', emoji: '🇫🇷' },
  { code: 'de', name: 'German', emoji: '🇩🇪' },
  { code: 'hi', name: 'Hindi', emoji: '🇮🇳' },
  { code: 'ja', name: 'Japanese', emoji: '🇯🇵' },
  { code: 'ko', name: 'Korean', emoji: '🇰🇷' },
  { code: 'zh', name: 'Chinese', emoji: '🇨🇳' },
];

export const METRICS = [
  { label: 'Latency', value: '120ms', icon: '⚡' },
  { label: 'Accuracy', value: '98.5%', icon: '🎯' },
  { label: 'Speed', value: '3.5x', icon: '🚀' },
];

export const STAGE_LABELS = {
  idle: {
    text: "Ready to translate",
    sub: "Tap the mic or upload an audio file",
  },
  sdk_init: { text: "Loading SDK…", sub: "Initialising AI backends" },
  downloading: {
    text: "Downloading models…",
    sub: "First run only — models are cached",
  },
  loading: { text: "Loading models…", sub: "Preparing voice pipeline" },
  listening: { text: "Listening…", sub: "Speak now — stop when done" },
  processing: { text: "Transcribing…", sub: "Running speech-to-text" },
  generating: { text: "Translating…", sub: "LLM is generating the response" },
  speaking: { text: "Playing audio…", sub: "Synthesising translated speech" },
  error: { text: "Something went wrong", sub: "Tap to try again" },
};
