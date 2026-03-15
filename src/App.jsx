import { useState, useEffect } from 'react';
import { LANGUAGES, METRICS } from './constants';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const [voiceClone, setVoiceClone] = useState(true);
  const [progress, setProgress] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [transcripts] = useState([
    { id: 1, type: 'source', text: 'Hello, how can I help you today?', time: '12:00 PM' },
    { id: 2, type: 'target', text: 'Hola, ¿cómo puedo ayudarte hoy?', time: '12:00 PM' },
  ]);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setProgress((prev) => (prev < 100 ? prev + 10 : 0));
      }, 500);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleRecording = () => {
    if (isRecording) {
      setProgress(0);
    }
    setIsRecording(!isRecording);
  };

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
          <div className="hidden sm:block text-xs font-semibold px-3 py-1 bg-brand-mint text-green-600 rounded-full dark:bg-green-900/30 dark:text-green-400">
            LIVE TRANSLATION
          </div>
        </div>
      </header>

      <main className="w-full flex flex-col gap-8">
        {/* Controls Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-3xl flex flex-col gap-4 cute-shadow dark:bg-brand-dark-card dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Configuration</h3>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium dark:text-gray-300">Source Language</label>
              <select 
                value={sourceLang} 
                onChange={(e) => setSourceLang(e.target.value)}
                className="bg-white border-2 border-brand-lilac rounded-2xl p-3 focus:outline-none focus:border-brand-primary appearance-none cute-button dark:bg-gray-800 dark:border-gray-700 dark:text-white"
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
                className="bg-white border-2 border-brand-lilac rounded-2xl p-3 focus:outline-none focus:border-brand-primary appearance-none cute-button dark:bg-gray-800 dark:border-gray-700 dark:text-white"
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
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${voiceClone ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          </div>

          {/* Recording Main */}
          <div className="md:col-span-2 glass-card p-8 rounded-3xl flex flex-col items-center justify-center gap-6 cute-shadow relative overflow-hidden dark:bg-brand-dark-card dark:border-gray-800">
            {isRecording && (
              <div className="absolute inset-0 bg-brand-primary/5 animate-pulse" />
            )}
            
            <div className="flex flex-col items-center gap-6 relative z-10">
              <button 
                onClick={toggleRecording}
                className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 cute-button ${isRecording ? 'bg-brand-primary ring-8 ring-brand-primary/20 scale-110' : 'bg-white border-4 border-brand-primary hover:bg-brand-primary/5 dark:bg-gray-800 dark:hover:bg-brand-primary/10'}`}
              >
                {isRecording ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-brand-primary" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              
              <div className="text-center">
                <h2 className="text-xl font-bold dark:text-white">{isRecording ? 'Listening...' : 'Ready to translate'}</h2>
                <p className="text-gray-400 text-sm mt-1">{isRecording ? 'Your voice is being cloned and translated in real-time' : 'Tap the microphone to start'}</p>
              </div>

              {isRecording && (
                <div className="w-64 h-2 bg-gray-100 rounded-full overflow-hidden mt-2 dark:bg-gray-700">
                  <div 
                    className="h-full bg-brand-primary transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Translation Output */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider px-2">Source Transcript</h3>
            <div className="glass-card p-6 rounded-3xl min-h-[150px] flex flex-col gap-4 dark:bg-brand-dark-card dark:border-gray-800">
              {transcripts.filter(t => t.type === 'source').map(t => (
                <div key={t.id} className="animate-fade-in-up">
                  <span className="text-[10px] text-gray-400 block mb-1">{t.time}</span>
                  <p className="text-lg font-medium dark:text-gray-200">{t.text}</p>
                </div>
              ))}
              {isRecording && <div className="flex gap-1 animate-bounce"><div className="w-1.5 h-1.5 bg-brand-primary rounded-full"/><div className="w-1.5 h-1.5 bg-brand-primary rounded-full"/><div className="w-1.5 h-1.5 bg-brand-primary rounded-full"/></div>}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider px-2">Translated Audio</h3>
            <div className="glass-card translated-audio-card p-6 rounded-3xl min-h-[150px] flex flex-col gap-4">
              {transcripts.filter(t => t.type === 'target').map(t => (
                <div key={t.id} className="animate-fade-in-up flex items-start gap-4">
                  <div className="flex-1">
                    <span className="text-[10px] text-gray-400 block mb-1">{t.time}</span>
                    <p className="text-lg font-bold text-brand-secondary dark:text-brand-pink">{t.text}</p>
                    <div className="mt-4 flex items-center gap-2">
                       <button className="w-10 h-10 rounded-full flex items-center justify-center text-brand-secondary cute-button bg-white dark:bg-gray-700 dark:text-brand-pink flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <div className="flex-1 h-1 bg-white/50 rounded-full relative overflow-hidden dark:bg-gray-700">
                        <div className="absolute inset-y-0 left-0 bg-brand-secondary w-1/3 dark:bg-brand-pink" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Metrics Footer */}
        <div className="glass-card p-6 rounded-3xl grid grid-cols-3 gap-8 cute-shadow dark:bg-brand-dark-card dark:border-gray-800">
          {METRICS.map(metric => (
            <div key={metric.label} className="flex flex-col items-center">
              <span className="text-2xl mb-1">{metric.icon}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{metric.label}</span>
              <span className="text-lg font-bold dark:text-gray-300">{metric.value}</span>
            </div>
          ))}
        </div>
      </main>

      <footer className="mt-12 text-gray-400 text-sm pb-8">
        &copy; 2026 Let'sTalk.live • Simple. Cute. Real-time.
      </footer>
    </div>
  );
}

export default App;
