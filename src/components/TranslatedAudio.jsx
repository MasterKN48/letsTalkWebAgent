import CustomAudioPlayer from "./CustomAudioPlayer";

/**
 * Displays the list of translated texts and provides audio playback for each.
 * 
 * @param {Array} transcripts - List of transcript objects.
 */
export default function TranslatedAudio({ transcripts }) {
  const targetTranscripts = transcripts.filter((t) => t.type === "target");

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider px-2">
        Translated Audio
      </h3>
      <div className="glass-card translated-audio-card p-6 rounded-3xl min-h-[150px] flex flex-col gap-4">
        {targetTranscripts.map((t) => (
          <div
            key={t.id}
            className="animate-fade-in-up flex items-start gap-4 min-w-0"
          >
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-gray-400 block mb-1">
                {t.isStreaming ? "live" : t.time}
              </span>
              <p className="text-lg font-bold text-brand-secondary dark:text-brand-pink break-words whitespace-pre-wrap">
                {t.text}
                {t.isStreaming && (
                  <span className="inline-block w-0.5 h-5 bg-brand-primary ml-0.5 animate-pulse align-middle" />
                )}
              </p>
              {t.audioBlobUrl && (
                <CustomAudioPlayer
                  audioBlobUrl={t.audioBlobUrl}
                  isTarget={true}
                />
              )}
            </div>
          </div>
        ))}

        {targetTranscripts.length === 0 && (
          <p className="text-gray-300 dark:text-gray-600 text-sm italic">
            Translated text and audio will appear here…
          </p>
        )}
      </div>
    </div>
  );
}
