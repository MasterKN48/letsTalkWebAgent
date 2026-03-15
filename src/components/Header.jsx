/**
 * Application header with logo, theme toggle, and status badge.
 * 
 * @param {boolean} darkMode - Current dark mode state.
 * @param {Function} setDarkMode - Callback to toggle dark mode.
 * @param {boolean} isActive - Whether the pipeline is active.
 * @param {string} stage - Current pipeline stage (e.g., 'listening', 'processing').
 */
export default function Header({ darkMode, setDarkMode, isActive, stage }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-center">
      <div className="w-full max-w-5xl glass-card rounded-3xl px-6 py-3 flex items-center justify-between cute-shadow">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-brand-primary rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-black tracking-tight text-gray-800 dark:text-white">
            Let's<span className="text-brand-primary font-serif italic">Talk</span>.live
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
            aria-label="Toggle theme"
          >
            {darkMode ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h1M4 12H3m15.364-6.364l.707-.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>
          <div className="flex items-center gap-2">
            <div
              className={`hidden sm:block text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                isActive
                  ? "bg-brand-primary/20 text-brand-primary dark:bg-brand-primary/30 animate-pulse"
                  : "bg-brand-mint text-green-600 dark:bg-green-900/30 dark:text-green-400"
              }`}
            >
              {isActive ? stage.toUpperCase().replace("_", " ") : "READY"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
