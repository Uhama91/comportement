// Story 19.2 — Transcript preview banner
// Shows transcribed text between toolbar and table when dictation is done

import { useDictationStore } from '../../../shared/stores/dictationStore';

export function TranscriptPreview() {
  const { state, transcribedText, clear } = useDictationStore();

  if (state !== 'done' || !transcribedText) return null;

  return (
    <div className="mx-4 mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-blue-700 mb-0.5">Texte transcrit</p>
        <p className="text-sm text-slate-700 break-words">{transcribedText}</p>
        <p className="text-xs text-slate-400 mt-1 italic">
          Prochaine etape : classification automatique
        </p>
      </div>
      <button
        onClick={clear}
        className="shrink-0 p-1 text-slate-400 hover:text-slate-600 transition-colors"
        title="Fermer"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
