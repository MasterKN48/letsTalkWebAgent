/**
 * The central hub for recording audio from the microphone or uploading audio files.
 * 
 * @param {boolean} isListening - Whether the microphone is active.
 * @param {number} ringScale - Current scale factor for the microphone ring animation.
 * @param {Function} onMicClick - Callback for clicking the microphone button.
 * @param {Function} onUploadClick - Callback for clicking the upload button.
 * @param {boolean} isActive - Whether the system is currently processing.
 * @param {Object} stageInfo - Display info for the current stage.
 * @param {string} stage - Current pipeline stage.
 * @param {string} downloadLabel - Label for the current download if applicable.
 * @param {string} uploadedFileName - Name of the file being processed if any.
 * @param {number} audioLevel - Current audio input level for visualization.
 * @param {string} error - Current error message if any.
 */
export default function RecordingHub({
  isListening,
  ringScale,
  onMicClick,
  onUploadClick,
  isActive,
  stageInfo,
  stage,
  downloadLabel,
  uploadedFileName,
  audioLevel,
  error,
}) {
  return (
    <div className="md:col-span-2 glass-card p-8 rounded-3xl flex flex-col items-center justify-center gap-6 cute-shadow relative overflow-hidden dark:bg-brand-dark-card dark:border-gray-800">
      {isListening && (
        <div className="absolute inset-0 bg-brand-primary/5 animate-pulse" />
      )}

      <div className="flex flex-col items-center gap-6 relative z-10">
        <div className="flex items-center gap-6">
          {/* Mic button */}
          <div
            className="relative flex items-center justify-center"
            style={{ transform: `scale(${ringScale})` }}
          >
            <div
              className={`absolute inset-0 rounded-full bg-brand-primary/20 blur-xl transition-all duration-300 ${
                isListening ? "opacity-100 animate-pulse" : "opacity-0"
              }`}
            />
            <button
              id="mic-button"
              onClick={onMicClick}
              disabled={isActive && !isListening}
              className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center transition-all duration-500 cute-button relative z-10
                ${
                  isListening
                    ? "bg-brand-primary text-white shadow-brand-primary/50 scale-110 shadow-2xl"
                    : "bg-white text-brand-primary border-4 border-brand-lilac hover:border-brand-primary dark:bg-gray-800"
                }
                disabled:opacity-60 disabled:cursor-wait`}
            >
              {isListening ? (
                <div className="flex items-center justify-center">
                  <div className="absolute w-full h-full rounded-full border-4 border-white/30 animate-ping" />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 sm:h-12 w-12"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10 sm:h-12 w-12"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
            <span className="text-[10px] font-bold text-gray-400 uppercase">or</span>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
          </div>

          {/* Upload button */}
          <button
            id="upload-button"
            onClick={onUploadClick}
            disabled={isActive}
            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all duration-500 cute-button
              bg-white border-4 border-brand-secondary hover:bg-brand-secondary/5 dark:bg-gray-800 dark:hover:bg-brand-secondary/10
              disabled:opacity-60 disabled:cursor-wait`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 sm:h-10 sm:w-10 text-brand-secondary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <span className="text-[10px] font-bold text-brand-secondary mt-1 uppercase">
              Upload
            </span>
          </button>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold dark:text-white">{stageInfo.text}</h2>
          <p className="text-gray-400 text-sm mt-1">
            {stage === "downloading" && downloadLabel
              ? `⬇ ${downloadLabel}`
              : uploadedFileName && isActive
                ? `📄 ${uploadedFileName}`
                : stageInfo.sub}
          </p>
        </div>

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

        {uploadedFileName && isActive && stage !== "downloading" && stage !== "sdk_init" && (
          <div className="flex items-center gap-2 px-4 py-2 bg-brand-secondary/10 rounded-2xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-brand-secondary animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="text-xs font-medium text-brand-secondary dark:text-brand-pink">
              Processing {uploadedFileName}
            </span>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-xl max-w-xs text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
