export const LANGUAGES = [
  { code: 'en', name: 'English', emoji: '🇺🇸' },
  { code: 'hi', name: 'Hindi', emoji: '🇮🇳' },
  { code: 'es', name: 'Spanish', emoji: '🇪🇸' },
  { code: 'fr', name: 'French', emoji: '🇫🇷' },
  { code: 'de', name: 'German', emoji: '🇩🇪' },
];

export const METRICS = [
  { label: 'Latency', value: '120ms', icon: '⚡' },
  { label: 'Accuracy', value: '98.5%', icon: '🎯' },
  { label: 'Speed', value: '3.5x', icon: '🚀' },
];

export const STAGE_LABELS = {
  idle: {
    text: "Ready to translate",
    sub: "Tap the mic to start listening",
  },
  listening: { text: "Listening...", sub: "Wait for speech detection" },
  recording: { text: "Recording...", sub: "Speak naturally up to 5s" },
  processing: { text: "Processing...", sub: "Speech-to-Text (Whisper)" },
  generating: { text: "Translating...", sub: "Translation (OPUS-MT)" },
  speaking: { text: "Speaking...", sub: "Text-to-Speech (Chatterbox)" },
  error: { text: "Something went wrong", sub: "Tap the mic to try again" },
};
