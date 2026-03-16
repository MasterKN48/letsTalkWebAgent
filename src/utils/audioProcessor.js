import { MicVAD } from "@ricky0123/vad-web";

export class AudioProcessor {
  constructor(options = {}) {
    this.onSpeechEnd = options.onSpeechEnd || (() => {});
    this.onSpeechStart = options.onSpeechStart || (() => {});
    this.onChunk = options.onChunk || (() => {}); // New callback for streaming
    this.onVADMisfire = options.onVADMisfire || (() => {});
    this.onFrameProcessed = options.onFrameProcessed || (() => {});
    this.vad = null;
    this.isListening = false;
    this.isSpeaking = false;
  }

  async start() {
    if (this.isListening) return;

    this.vad = await MicVAD.new({
      onSpeechStart: () => {
        console.log("Speech start detected");
        this.isSpeaking = true;
        this.onSpeechStart();
      },
      onSpeechEnd: (audio) => {
        console.log("Speech end detected");
        this.isSpeaking = false;
        this.onSpeechEnd(audio);
      },
      onVADMisfire: () => {
        console.log("VAD misfire");
        this.isSpeaking = false;
        this.onVADMisfire();
      },
      onFrameProcessed: (probs, frame) => {
        // probs.isSpeech is the probability of speech
        const level = probs.isSpeech;
        this.onFrameProcessed(level);

        // Emit chunks if we are speaking
        if (this.isSpeaking && frame) {
          this.onChunk(frame);
        }
      },
      minSpeechFrames: 5,
      positiveSpeechThreshold: 0.8,
      negativeSpeechThreshold: 0.8 - 0.15,
      redemptionFrames: 20,
      preSpeechPadFrames: 10,
    });

    this.vad.start();
    this.isListening = true;
  }
  // ... rest of methods

  stop() {
    if (this.vad) {
      this.vad.pause();
      this.isListening = false;
    }
  }

  destroy() {
    if (this.vad) {
      this.vad.destroy();
      this.vad = null;
      this.isListening = false;
    }
  }
}
