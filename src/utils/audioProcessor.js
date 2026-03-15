import { MicVAD } from "@ricky0123/vad-web";

export class AudioProcessor {
  constructor(options = {}) {
    this.onSpeechEnd = options.onSpeechEnd || (() => {});
    this.onSpeechStart = options.onSpeechStart || (() => {});
    this.onVADMisfire = options.onVADMisfire || (() => {});
    this.onFrameProcessed = options.onFrameProcessed || (() => {});
    this.vad = null;
    this.isListening = false;
  }

  async start() {
    if (this.isListening) return;

    this.vad = await MicVAD.new({
      onSpeechStart: () => {
        console.log("Speech start detected");
        this.onSpeechStart();
      },
      onSpeechEnd: (audio) => {
        console.log("Speech end detected");
        // audio is a Float32Array of the detected speech segment
        this.onSpeechEnd(audio);
      },
      onVADMisfire: () => {
        console.log("VAD misfire");
        this.onVADMisfire();
      },
      onFrameProcessed: (probs) => {
        // probs.isSpeech is the probability of speech
        const level = probs.isSpeech;
        this.onFrameProcessed(level);
      },
      // Silero VAD works best with 16kHz
      minSpeechFrames: 5,
      positiveSpeechThreshold: 0.8,
      negativeSpeechThreshold: 0.8 - 0.15,
      redemptionFrames: 20, // Keep recording for a bit after speech ends
      preSpeechPadFrames: 10,
    });

    this.vad.start();
    this.isListening = true;
  }

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
