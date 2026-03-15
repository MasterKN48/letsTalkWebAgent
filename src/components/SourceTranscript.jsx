import CustomAudioPlayer from "./CustomAudioPlayer";

/**
 * Displays the list of source transcripts with their timestamps and audio playback.
 * 
 * @param {Array} transcripts - List of transcript objects.
 * @param {string} stage - Current pipeline stage.
 * @param {Function} onClearAll - Callback to clear all transcripts.
 */
export default function SourceTranscript({ transcripts, stage, onClearAll }) {
  const sourceTranscripts = transcripts.filter((t) => t.type === "source");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
          Source Transcript
        </h3>
        {transcripts.length > 0 && (
          <button
            onClick={onClearAll}
            className="cursor-pointer rounded-full bg-red-500/10 hover:bg-red-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-500 hover:text-white transition-all active:scale-95"
          >
            Clear All
          </button>
        )}
      </div>
      <div className="glass-card p-6 rounded-3xl min-h-[150px] flex flex-col gap-4 dark:bg-brand-dark-card dark:border-gray-800">
        {sourceTranscripts.map((t) => (
          <div
            key={t.id}
            className="animate-fade-in-up group flex items-start justify-between min-w-0"
          >
            <div className="min-w-0 flex-1 pr-4">
              <span className="text-[10px] text-gray-400 block mb-1">
                {t.time}
              </span>
              <p className="text-lg font-medium dark:text-gray-200 break-words whitespace-pre-wrap">
                {t.text}
              </p>
            </div>
            {t.audioBlobUrl && (
              <CustomAudioPlayer
                audioBlobUrl={t.audioBlobUrl}
                isTarget={false}
              />
            )}
          </div>
        ))}
        {(stage === "processing" || stage === "listening") && (
          <div className="flex gap-1 animate-bounce">
            <div className="w-1.5 h-1.5 bg-brand-primary rounded-full" />
            <div className="w-1.5 h-1.5 bg-brand-primary rounded-full" />
            <div className="w-1.5 h-1.5 bg-brand-primary rounded-full" />
          </div>
        )}
        {sourceTranscripts.length === 0 && stage === "idle" && (
          <p className="text-gray-300 dark:text-gray-600 text-sm italic">
            Your spoken words will appear here…
          </p>
        )}
      </div>
    </div>
  );
}
