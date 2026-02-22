// Story 19.2 + 19.3 — Transcript preview banner with classification
// Shows transcribed text, classify button, and classification result

import { useDictationStore } from '../../../shared/stores/dictationStore';

export function TranscriptPreview() {
  const { state, transcribedText, classificationResult, error, classifyText, clear } =
    useDictationStore();

  // Only show when there's something to display
  if (state === 'idle' || state === 'recording' || state === 'processing') return null;

  return (
    <div className="mx-4 mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
      <div className="flex-1 min-w-0">
        {/* Transcribed text */}
        {transcribedText && (
          <>
            <p className="text-xs font-medium text-blue-700 mb-0.5">Texte transcrit</p>
            <p className="text-sm text-slate-700 break-words">{transcribedText}</p>
          </>
        )}

        {/* State: done — show classify button */}
        {state === 'done' && (
          <button
            onClick={classifyText}
            className="mt-2 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
          >
            Classifier
          </button>
        )}

        {/* State: classifying — spinner */}
        {state === 'classifying' && (
          <div className="mt-2 flex items-center gap-2">
            <svg
              className="w-4 h-4 animate-spin text-indigo-600"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-xs text-indigo-600">Classification en cours...</span>
          </div>
        )}

        {/* State: classified — show result */}
        {state === 'classified' && classificationResult && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-green-700">Domaine identifie :</span>
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full font-medium">
                {classificationResult.domaine_nom}
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600 mb-0.5">Observation proposee :</p>
              <p className="text-sm text-slate-700 bg-white/60 px-2 py-1 rounded border border-slate-200">
                {classificationResult.observation_after}
              </p>
            </div>
            {classificationResult.observation_before && (
              <div>
                <p className="text-xs font-medium text-slate-400 mb-0.5">Observation precedente :</p>
                <p className="text-xs text-slate-400 italic">
                  {classificationResult.observation_before}
                </p>
              </div>
            )}
            <p className="text-xs text-slate-400 italic">
              En attente du panneau de revision (Story 20.1)
            </p>
          </div>
        )}

        {/* State: error */}
        {state === 'error' && error && (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={clear}
        className="shrink-0 p-1 text-slate-400 hover:text-slate-600 transition-colors"
        title="Fermer"
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
