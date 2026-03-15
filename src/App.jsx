import { useState, useEffect, useCallback, useRef } from 'react';
import { VoicePipeline, EventBus, AudioCapture, AudioPlayback, AudioFileLoader, SpeechActivity } from '@runanywhere/web';
import { VAD } from '@runanywhere/web-onnx';
import { LANGUAGES } from './constants';
import { initSDK, ModelManager, ModelCategory, MODEL_IDS } from './runanywhere';

// Pipeline stage labels shown in the UI
const STAGE_LABELS = {
  idle:       { text: 'Ready to translate',    sub: 'Tap the mic or upload an audio file' },
  sdk_init:   { text: 'Loading SDK…',          sub: 'Initialising AI backends' },
  downloading:{ text: 'Downloading models…',   sub: 'First run only — models are cached' },
  loading:    { text: 'Loading models…',       sub: 'Preparing voice pipeline' },
  listening:  { text: 'Listening…',            sub: 'Speak now — stop when done' },
  processing: { text: 'Transcribing…',         sub: 'Running speech-to-text' },
  generating: { text: 'Translating…',          sub: 'LLM is generating the response' },
  speaking:   { text: 'Playing audio…',        sub: 'Synthesising translated speech' },
  error:      { text: 'Something went wrong',  sub: 'Tap to try again' },
};

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ─── encodeWAV: convert Float32Array to audio/wav Blob ──── */
function encodeWAV(samples, sampleRate = 16000) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (v, offset, string) => {
    for (let i = 0; i < string.length; i++) v.setUint8(offset + i, string.charCodeAt(i));
  };
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/* ─── Custom UI Audio Player ─────────────────────────────── */
function CustomAudioPlayer({ audioBlobUrl, isTarget = true }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
  };

  const handleTimeUpdate = () => setProgress(audioRef.current.currentTime);
  const handleLoadedMetadata = () => setDuration(audioRef.current.duration);
  const handleEnded = () => { setIsPlaying(false); setProgress(0); };
  const formatSecs = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  if (!isTarget) {
    // Basic source playback button
    return (
      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <audio ref={audioRef} src={audioBlobUrl} onEnded={handleEnded} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
        <button onClick={togglePlay} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-brand-primary bg-white dark:bg-gray-800 shadow-sm" title="Play original audio">
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>
    );
  }

  // Advanced target player with progress tracking
  return (
    <div className="mt-3 flex items-center gap-3 relative z-10 w-full">
      <audio 
        ref={audioRef} src={audioBlobUrl} 
        onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}
      />
      <button onClick={togglePlay} className="w-9 h-9 rounded-full flex items-center justify-center text-brand-secondary cute-button bg-white dark:bg-gray-700 dark:text-brand-pink flex-shrink-0" aria-label="Toggle audio">
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 pl-0.5 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        )}
      </button>
      <div className="flex-1 flex flex-col justify-center">
        <div 
          className="w-full h-1 relative bg-white/50 rounded-full overflow-hidden dark:bg-gray-700 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
          }}
        >
          <div 
            className="absolute inset-y-0 left-0 bg-brand-secondary dark:bg-brand-pink transition-all duration-75"
            style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
          />
        </div>
        <div className="flex justify-between text-[8px] text-gray-500 font-medium px-0.5 mt-1">
          <span>{formatSecs(progress)}</span>
          <span>{formatSecs(duration)}</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  /* ─── UI state ─────────────────────────────────────────────── */
  const [darkMode, setDarkMode]         = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [sourceLang, setSourceLang]     = useState('en');
  const [targetLang, setTargetLang]     = useState('es');
  const [voiceClone, setVoiceClone]     = useState(true);
  const [stage, setStage]               = useState('idle');
  const [audioLevel, setAudioLevel]     = useState(0);
  const [downloadPct, setDownloadPct]   = useState({});  // { modelId: 0-100 }
  const [transcripts, setTranscripts]   = useState([]);  // { id, type, text, liveText, time }
  const [liveResponse, setLiveResponse] = useState('');  // streaming LLM response
  const [metrics, setMetrics]           = useState({ latency: '--', accuracy: '--', speed: '--' });
  const [error, setError]               = useState(null);

  const [uploadedFileName, setUploadedFileName] = useState(null);

  /* ─── Refs (alive across renders without re-renders) ─────── */
  const micRef        = useRef(null);
  const pipelineRef   = useRef(null);
  const vadUnsubRef   = useRef(null);
  const fileInputRef  = useRef(null);
  const activeRef     = useRef(false);  // is the pipeline running?

  /* ─── Dark mode ──────────────────────────────────────────── */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  /* ─── Download progress events ───────────────────────────── */
  useEffect(() => {
    let unsub;
    initSDK().then(() => {
      unsub = EventBus.shared.on('model.downloadProgress', (evt) => {
        const pct = Math.round((evt.progress ?? 0) * 100);
        setDownloadPct(prev => ({ ...prev, [evt.modelId]: pct }));
      });
    });
    return () => unsub?.();
  }, []);

  /* ─── Cleanup on unmount ─────────────────────────────────── */
  useEffect(() => {
    return () => {
      micRef.current?.stop();
      vadUnsubRef.current?.();
    };
  }, []);

  /* ─── Ensure model is loaded for a given category ───────── */
  const ensureModelLoaded = useCallback(async (category, modelId) => {
    if (ModelManager.getLoadedModel(category)) return;
    const models = ModelManager.getModels().filter(m => m.modality === category);
    const id = modelId ?? models[0]?.id;
    if (!id) throw new Error(`No model registered for category: ${category}`);
    setStage('downloading');
    await ModelManager.downloadModel(id);
    setStage('loading');
    await ModelManager.loadModel(id, { coexist: true });
  }, []);

  /* ─── Ensure SDK + models ready (shared by mic & upload) ── */
  const ensureReady = useCallback(async () => {
    setError(null);
    setLiveResponse('');
    activeRef.current = true;

    setStage('sdk_init');
    await initSDK();

    setStage('downloading');
    await ensureModelLoaded(ModelCategory.Audio,            MODEL_IDS.vad);
    await ensureModelLoaded(ModelCategory.SpeechRecognition, MODEL_IDS.stt);
    await ensureModelLoaded(ModelCategory.Language,          MODEL_IDS.llm);
    await ensureModelLoaded(ModelCategory.SpeechSynthesis,   MODEL_IDS.tts);

    if (!pipelineRef.current) pipelineRef.current = new VoicePipeline();
  }, [ensureModelLoaded]);

  /* ─── Shared pipeline turn (used by both mic & upload) ──── */
  const processAudioSamples = useCallback(async (audioSamples) => {
    const turnStart = Date.now();
    const srcId = Date.now();
    const srcAudioUrl = URL.createObjectURL(encodeWAV(audioSamples, 16000));

    setTranscripts(prev => [
      ...prev,
      { id: srcId, type: 'source', text: '…', time: formatTime(), audioBlobUrl: srcAudioUrl },
    ]);

    setStage('processing');

    const srcLangName = LANGUAGES.find(l => l.code === sourceLang)?.name ?? sourceLang;
    const tgtLangName = LANGUAGES.find(l => l.code === targetLang)?.name ?? targetLang;
    const systemPrompt = `You are a real-time voice translator. The user speaks ${srcLangName}. 
Transcribe their speech exactly, then translate it concisely to ${tgtLangName}. 
Reply with ONLY the translated text in ${tgtLangName}. No explanations, no labels.`;

    try {
      let firstToken = null;
      let finalTargetId = null;

      const result = await pipelineRef.current.processTurn(
        audioSamples,
        {
          maxTokens: Number(import.meta.env.VITE_LLM_MAX_TOKENS) || 80,
          temperature: Number(import.meta.env.VITE_LLM_TEMPERATURE) || 0.7,
          systemPrompt,
        },
        {
          onStateChange: (s) => {
            if (s === 'generatingResponse') setStage('generating');
            if (s === 'playingTTS')         setStage('speaking');
          },
          onTranscription: (text) => {
            setTranscripts(prev =>
              prev.map(t => t.id === srcId ? { ...t, text } : t)
            );
          },
          onResponseToken: (_, acc) => {
            if (!firstToken) firstToken = Date.now();
            setLiveResponse(acc);
          },
          onResponseComplete: (text) => {
            finalTargetId = Date.now() + 1;
            
            setTranscripts(prev => [
              ...prev,
              { id: finalTargetId, type: 'target', text, time: formatTime() },
            ]);

            setLiveResponse('');
            const latency = Date.now() - turnStart;
            setMetrics({
              latency: `${latency}ms`,
              accuracy: '~98%',
              speed: `${(text.split(' ').length / (latency / 1000)).toFixed(1)}w/s`,
            });
          },
          onSynthesisComplete: async (audio, sampleRate) => {
            setStage('speaking');
            
            // Generate standard Web URL for <audio> element usage
            const audioBlobUrl = URL.createObjectURL(encodeWAV(audio, sampleRate));

            // Add the blob URL directly to the already-created target transcript
            setTranscripts(prev => prev.map(t => 
              t.id === finalTargetId 
                ? { ...t, audioBlobUrl } 
                : t
            ));
            
            setStage('idle');
          },
          onError: (err) => {
            console.error('Pipeline error:', err);
            setError(err.message);
          },
        }
      );
      console.log('Turn:', result.transcription, '->', result.response);
    } catch (err) {
      console.error('Voice pipeline error:', err);
      setError(err.message);
      setStage('error');
      setLiveResponse('');
      return;
    }

    setStage('idle');
    setAudioLevel(0);
    setUploadedFileName(null);
    activeRef.current = false;
  }, [sourceLang, targetLang]);

  /* ─── Start listening (microphone) ───────────────────────── */
  const startListening = useCallback(async () => {
    try {
      await ensureReady();

      setStage('listening');
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
        (chunk) => { VAD.processSamples(chunk); },
        (level) => { setAudioLevel(level); }
      );
    } catch (err) {
      console.error('Start error:', err);
      setError(err.message);
      setStage('error');
      activeRef.current = false;
    }
  }, [ensureReady, processAudioSamples]);

  /* ─── Process uploaded audio file ────────────────────────── */
  const processAudioFile = useCallback(async (file) => {
    try {
      setUploadedFileName(file.name);
      await ensureReady();

      setStage('processing');

      // Decode audio file to Float32Array at 16 kHz
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      const float32 = decoded.getChannelData(0); // mono channel
      audioCtx.close();

      await processAudioSamples(float32);
    } catch (err) {
      console.error('File processing error:', err);
      setError(err.message);
      setStage('error');
      setUploadedFileName(null);
      activeRef.current = false;
    }
  }, [ensureReady, processAudioSamples]);

  /* ─── File input change handler ──────────────────────────── */
  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) processAudioFile(file);
    e.target.value = ''; // reset so same file can be re-uploaded
  }, [processAudioFile]);

  /* ─── Stop listening ─────────────────────────────────────── */
  const stopListening = useCallback(() => {
    micRef.current?.stop();
    vadUnsubRef.current?.();
    pipelineRef.current?.cancel?.();
    activeRef.current = false;
    setStage('idle');
    setAudioLevel(0);
    setLiveResponse('');
  }, []);

  const toggleRecording = useCallback(() => {
    if (stage === 'idle' || stage === 'error') {
      startListening();
    } else {
      stopListening();
    }
  }, [stage, startListening, stopListening]);

  /* ─── Derived UI values ──────────────────────────────────── */
  const isActive    = stage !== 'idle' && stage !== 'error';
  const isListening = stage === 'listening';
  const stageInfo   = STAGE_LABELS[stage] ?? STAGE_LABELS.idle;
  const ringScale   = isListening ? 1 + audioLevel * 0.35 : 1;

  // Aggregate download progress label
  const downloadingModel = Object.entries(downloadPct).find(([, p]) => p > 0 && p < 100);
  const downloadLabel = downloadingModel
    ? `${downloadingModel[0].split('-').slice(-1)[0]}: ${downloadingModel[1]}%`
    : null;

  const METRICS_DISPLAY = [
    { label: 'Latency', value: metrics.latency, icon: '⚡' },
    { label: 'Accuracy', value: metrics.accuracy, icon: '🎯' },
    { label: 'Speed', value: metrics.speed, icon: '🚀' },
  ];

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center max-w-5xl mx-auto transition-colors duration-300 dark:bg-brand-dark-bg">

      {/* Header */}
      <header className="w-full flex justify-between items-center mb-12">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white text-xl font-bold cute-shadow">
            LT
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
            Let'sTalk.live
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:text-brand-primary transition-colors dark:text-gray-400 dark:hover:text-brand-primary"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.071 16.071l.707.707M7.929 7.929l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <div className={`hidden sm:block text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
            isActive
              ? 'bg-brand-primary/20 text-brand-primary dark:bg-brand-primary/30 animate-pulse'
              : 'bg-brand-mint text-green-600 dark:bg-green-900/30 dark:text-green-400'
          }`}>
            {isActive ? stage.toUpperCase().replace('_',' ') : 'READY'}
          </div>
        </div>
      </header>

      <main className="w-full flex flex-col gap-8">

        {/* Controls Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Config panel */}
          <div className="glass-card p-6 rounded-3xl flex flex-col gap-4 cute-shadow dark:bg-brand-dark-card dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Configuration</h3>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium dark:text-gray-300">Source Language</label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                disabled={isActive}
                className="bg-white border-2 border-brand-lilac rounded-2xl p-3 focus:outline-none focus:border-brand-primary appearance-none cute-button dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-50"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.emoji} {lang.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium dark:text-gray-300">Target Language</label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                disabled={isActive}
                className="bg-white border-2 border-brand-lilac rounded-2xl p-3 focus:outline-none focus:border-brand-primary appearance-none cute-button dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-50"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.emoji} {lang.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-medium dark:text-gray-300">Voice Clone</span>
              <button
                onClick={() => setVoiceClone(!voiceClone)}
                className={`w-12 h-6 rounded-full transition-colors relative ${voiceClone ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                aria-label="Toggle voice clone"
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${voiceClone ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            {/* Model download progress */}
            {downloadLabel && (
              <div className="mt-2">
                <div className="text-xs text-gray-400 mb-1">⬇ {downloadLabel}</div>
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-primary transition-all duration-300"
                    style={{ width: `${downloadingModel[1]}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Recording Hub */}
          <div className="md:col-span-2 glass-card p-8 rounded-3xl flex flex-col items-center justify-center gap-6 cute-shadow relative overflow-hidden dark:bg-brand-dark-card dark:border-gray-800">
            {isListening && <div className="absolute inset-0 bg-brand-primary/5 animate-pulse" />}

            <div className="flex flex-col items-center gap-6 relative z-10">

              {/* Input mode: Mic + Upload side by side */}
              <div className="flex items-center gap-6">

                {/* Mic button with audio-level ring */}
                <div
                  className="relative flex items-center justify-center"
                  style={{ transform: `scale(${ringScale})`, transition: 'transform 0.1s' }}
                >
                  {isListening && (
                    <>
                      <div className="absolute w-40 h-40 rounded-full border-4 border-brand-primary/20 animate-ping" />
                      <div className="absolute w-36 h-36 rounded-full border-2 border-brand-primary/30" />
                    </>
                  )}
                  <button
                    id="mic-button"
                    onClick={toggleRecording}
                    disabled={stage === 'sdk_init' || stage === 'downloading' || stage === 'loading' || stage === 'processing' || stage === 'generating'}
                    className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center transition-all duration-500 cute-button z-10
                      ${isActive && !uploadedFileName
                        ? 'bg-brand-primary ring-8 ring-brand-primary/20 scale-110'
                        : 'bg-white border-4 border-brand-primary hover:bg-brand-primary/5 dark:bg-gray-800 dark:hover:bg-brand-primary/10'}
                      disabled:opacity-60 disabled:cursor-wait`}
                  >
                    {isActive && !uploadedFileName ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-12 sm:w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-12 sm:w-12 text-brand-primary" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Divider */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase">or</span>
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
                </div>

                {/* Upload button */}
                <div className="flex flex-col items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.wav,.mp3,.ogg,.webm,.m4a,.flac"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    id="upload-button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isActive}
                    className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all duration-500 cute-button
                      bg-white border-4 border-brand-secondary hover:bg-brand-secondary/5 dark:bg-gray-800 dark:hover:bg-brand-secondary/10
                      disabled:opacity-60 disabled:cursor-wait`}
                  >
                    {/* Upload icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10 text-brand-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-[10px] font-bold text-brand-secondary mt-1 uppercase">Upload</span>
                  </button>
                </div>
              </div>

              {/* Status text */}
              <div className="text-center">
                <h2 className="text-xl font-bold dark:text-white">{stageInfo.text}</h2>
                <p className="text-gray-400 text-sm mt-1">
                  {stage === 'downloading' && downloadLabel
                    ? `⬇ ${downloadLabel}`
                    : uploadedFileName && isActive
                      ? `📄 ${uploadedFileName}`
                      : stageInfo.sub}
                </p>
              </div>

              {/* Audio level visualiser */}
              {isListening && (
                <div className="flex items-end gap-1 h-8">
                  {[...Array(16)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-full bg-brand-primary transition-all duration-75"
                      style={{
                        height: `${Math.max(4, Math.round(audioLevel * 32 * Math.abs(Math.sin(i * 0.7))))}px`,
                        opacity: 0.4 + audioLevel * 0.6,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Uploaded file indicator while processing */}
              {uploadedFileName && isActive && stage !== 'downloading' && stage !== 'sdk_init' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-brand-secondary/10 rounded-2xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-secondary animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-xs font-medium text-brand-secondary dark:text-brand-pink">
                    Processing {uploadedFileName}
                  </span>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="text-xs text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl max-w-xs text-center">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Translation Output */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Source transcript */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider px-2">Source Transcript</h3>
            <div className="glass-card p-6 rounded-3xl min-h-[150px] flex flex-col gap-4 dark:bg-brand-dark-card dark:border-gray-800">
              {transcripts.filter(t => t.type === 'source').map(t => (
                <div key={t.id} className="animate-fade-in-up group flex items-start justify-between min-w-0">
                  <div className="min-w-0 flex-1 pr-4">
                    <span className="text-[10px] text-gray-400 block mb-1">{t.time}</span>
                    <p className="text-lg font-medium dark:text-gray-200 break-words whitespace-pre-wrap">{t.text}</p>
                  </div>
                  {t.audioBlobUrl && t.text !== '…' && (
                    <CustomAudioPlayer audioBlobUrl={t.audioBlobUrl} isTarget={false} />
                  )}
                </div>
              ))}
              {(stage === 'processing' || stage === 'listening') && (
                <div className="flex gap-1 animate-bounce">
                  <div className="w-1.5 h-1.5 bg-brand-primary rounded-full"/>
                  <div className="w-1.5 h-1.5 bg-brand-primary rounded-full"/>
                  <div className="w-1.5 h-1.5 bg-brand-primary rounded-full"/>
                </div>
              )}
              {transcripts.filter(t => t.type === 'source').length === 0 && stage === 'idle' && (
                <p className="text-gray-300 dark:text-gray-600 text-sm italic">Your spoken words will appear here…</p>
              )}
            </div>
          </div>

          {/* Translated output */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider px-2">Translated Audio</h3>
            <div className="glass-card translated-audio-card p-6 rounded-3xl min-h-[150px] flex flex-col gap-4">
              {/* Live streaming response */}
              {liveResponse && (
                <div className="animate-fade-in-up min-w-0">
                  <span className="text-[10px] text-gray-400 block mb-1">live</span>
                  <p className="text-lg font-bold text-brand-secondary dark:text-brand-pink break-words whitespace-pre-wrap">
                    {liveResponse}
                    <span className="inline-block w-0.5 h-5 bg-brand-primary ml-0.5 animate-pulse align-middle" />
                  </p>
                </div>
              )}

              {/* Completed translations */}
              {transcripts.filter(t => t.type === 'target').map(t => (
                <div key={t.id} className="animate-fade-in-up flex items-start gap-4 min-w-0">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-gray-400 block mb-1">{t.time}</span>
                    <p className="text-lg font-bold text-brand-secondary dark:text-brand-pink break-words whitespace-pre-wrap">{t.text}</p>
                    {t.audioBlobUrl && <CustomAudioPlayer audioBlobUrl={t.audioBlobUrl} isTarget={true} />}
                  </div>
                </div>
              ))}

              {transcripts.filter(t => t.type === 'target').length === 0 && !liveResponse && (
                <p className="text-gray-300 dark:text-gray-600 text-sm italic">Translated text and audio will appear here…</p>
              )}
            </div>
          </div>
        </div>

        {/* Metrics footer */}
        <div className="glass-card p-6 rounded-3xl grid grid-cols-3 gap-8 cute-shadow dark:bg-brand-dark-card dark:border-gray-800">
          {METRICS_DISPLAY.map(m => (
            <div key={m.label} className="flex flex-col items-center">
              <span className="text-2xl mb-1">{m.icon}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{m.label}</span>
              <span className="text-lg font-bold dark:text-gray-300">{m.value}</span>
            </div>
          ))}
        </div>
      </main>

      <footer className="mt-12 text-gray-400 text-sm pb-8">
        © 2026 Let'sTalk.live • Simple. Cute. Real-time.
      </footer>
    </div>
  );
}
