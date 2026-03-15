import { useState, useRef } from "react";

/**
 * A cute, premium audio player component.
 * Supports basic source playback and advanced target playback with progress tracking.
 * 
 * @param {string} audioBlobUrl - The URL of the audio blob to play.
 * @param {boolean} isTarget - If true, shows the advanced player with a progress bar.
 */
export default function CustomAudioPlayer({ audioBlobUrl, isTarget = true }) {
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
  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };
  const formatSecs = (s) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60)
      .toString()
      .padStart(2, "0")}`;

  if (!isTarget) {
    // Basic source playback button
    return (
      <div className="flex items-center">
        <audio
          ref={audioRef}
          src={audioBlobUrl}
          onEnded={handleEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        <button
          onClick={togglePlay}
          className="w-14 h-14 rounded-full flex items-center justify-center text-gray-400 hover:text-brand-primary bg-white dark:bg-gray-800 shadow-sm transition-all active:scale-95"
          title="Play original audio"
        >
          {isPlaying ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 pointer-events-none"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 pointer-events-none"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
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
        ref={audioRef}
        src={audioBlobUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <button
        onClick={togglePlay}
        className="w-14 h-14 rounded-full flex items-center justify-center text-brand-secondary cute-button bg-white dark:bg-gray-700 dark:text-brand-pink flex-shrink-0"
        aria-label="Toggle audio"
      >
        {isPlaying ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 pointer-events-none"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 pl-0.5 pointer-events-none"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>
      <div className="flex-1 flex flex-col justify-center">
        <div
          className="w-full h-1 relative bg-white/50 rounded-full overflow-hidden dark:bg-gray-700 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            audioRef.current.currentTime =
              ((e.clientX - rect.left) / rect.width) * duration;
          }}
        >
          <div
            className="absolute inset-y-0 left-0 bg-brand-secondary dark:bg-brand-pink transition-all duration-75"
            style={{
              width: `${duration > 0 ? (progress / duration) * 100 : 0}%`,
            }}
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
