import { LANGUAGES } from "../constants";

/**
 * Configuration panel for selecting source/target languages and other settings.
 * 
 * @param {string} sourceLang - Current source language code.
 * @param {string} targetLang - Current target language code.
 * @param {Function} setSourceLang - Callback to update source language.
 * @param {Function} setTargetLang - Callback to update target language.
 * @param {boolean} voiceClone - Whether voice cloning is enabled.
 * @param {Function} setVoiceClone - Callback to toggle voice cloning.
 * @param {boolean} isActive - Whether the pipeline is currently active (recording or processing).
 * @param {Object} downloadingModel - Current downloading model info [modelId, percentage].
 */
export default function ConfigPanel({
  sourceLang,
  targetLang,
  setSourceLang,
  setTargetLang,
  voiceClone,
  setVoiceClone,
  isActive,
  downloadingModel,
}) {
  const downloadLabel = downloadingModel ? downloadingModel[0].replace(/sherpa-onnx-|vits-piper-|lfm2-/g, "") : null;

  return (
    <div className="glass-card p-6 rounded-3xl flex flex-col gap-4 cute-shadow dark:bg-brand-dark-card dark:border-gray-800">
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
        Configuration
      </h3>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium dark:text-gray-300">
          Source Language
        </label>
        <select
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
          disabled={isActive}
          className="bg-white border-2 border-brand-lilac rounded-2xl p-3 focus:outline-none focus:border-brand-primary appearance-none cute-button dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-50"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.emoji} {lang.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium dark:text-gray-300">
          Target Language
        </label>
        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          disabled={isActive}
          className="bg-white border-2 border-brand-lilac rounded-2xl p-3 focus:outline-none focus:border-brand-primary appearance-none cute-button dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-50"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.emoji} {lang.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-sm font-medium dark:text-gray-300">
          Voice Clone
        </span>
        <button
          onClick={() => setVoiceClone(!voiceClone)}
          className={`w-12 h-6 rounded-full transition-colors relative ${voiceClone ? "bg-brand-primary" : "bg-gray-300 dark:bg-gray-600"}`}
          aria-label="Toggle voice clone"
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${voiceClone ? "right-1" : "left-1"}`}
          />
        </button>
      </div>

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
  );
}
