// Story 19.2 + 19.3 + 19.4 — Transcript preview with multi-domain classification + editable observations
// Shows transcribed text, classification progress, and per-domain editable cards with validate/reject

import { useState, useCallback } from 'react';
import { useDictationStore } from '../../../shared/stores/dictationStore';
import { useAppreciationStore } from '../../../shared/stores/appreciationStore';
import type { ClassificationResultItem } from '../../../shared/types';

export function TranscriptPreview() {
  const { state, transcribedText, classificationResults, error, clear } =
    useDictationStore();
  const { appreciations, addAppreciation, updateAppreciation, loadAppreciations } =
    useAppreciationStore();
  const [saving, setSaving] = useState(false);
  // Local editable observations: index → edited text
  const [editedTexts, setEditedTexts] = useState<Record<number, string>>({});
  // Removed items (by index)
  const [removedItems, setRemovedItems] = useState<Set<number>>(new Set());

  const { eleveId, periodeId } = useDictationStore();

  const getObservationText = useCallback(
    (item: ClassificationResultItem, index: number) => {
      return editedTexts[index] ?? item.observation_after;
    },
    [editedTexts]
  );

  const handleEditText = useCallback((index: number, value: string) => {
    setEditedTexts((prev) => ({ ...prev, [index]: value }));
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setRemovedItems((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  const handleValidateAll = async () => {
    if (!classificationResults || eleveId == null || periodeId == null) return;

    const activeItems = classificationResults.items.filter(
      (_, i) => !removedItems.has(i)
    );
    if (activeItems.length === 0) {
      clear();
      return;
    }

    setSaving(true);
    try {
      for (let i = 0; i < classificationResults.items.length; i++) {
        if (removedItems.has(i)) continue;
        const item = classificationResults.items[i];
        const finalText = getObservationText(item, i).trim();
        if (!finalText) continue;

        if (item.observation_before) {
          const existing = appreciations.find(
            (a) => a.domaineId === item.domaine_id
          );
          if (existing) {
            await updateAppreciation(existing.id, {
              observations: finalText,
            });
          } else {
            await addAppreciation({
              eleveId,
              periodeId,
              domaineId: item.domaine_id,
              observations: finalText,
              texteDictation: transcribedText,
            });
          }
        } else {
          await addAppreciation({
            eleveId,
            periodeId,
            domaineId: item.domaine_id,
            observations: finalText,
            texteDictation: transcribedText,
          });
        }
      }
      await loadAppreciations(eleveId, periodeId);
      setEditedTexts({});
      setRemovedItems(new Set());
      clear();
    } catch (e) {
      console.error('Erreur sauvegarde appreciations:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleReject = useCallback(() => {
    setEditedTexts({});
    setRemovedItems(new Set());
    clear();
  }, [clear]);

  // Only show when there's something to display
  if (state === 'idle' || state === 'recording' || state === 'processing' || state === 'done') return null;

  const activeItemCount = classificationResults
    ? classificationResults.items.filter((_, i) => !removedItems.has(i)).length
    : 0;

  return (
    <div className="mx-4 mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2 max-h-[60vh] overflow-y-auto">
      <div className="flex-1 min-w-0">
        {/* Transcribed text */}
        {transcribedText && (
          <>
            <p className="text-xs font-medium text-blue-700 mb-0.5">Texte transcrit</p>
            <p className="text-sm text-slate-700 break-words">{transcribedText}</p>
          </>
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

        {/* State: classified — show multi-domain results with editable textareas */}
        {state === 'classified' && classificationResults && (
          <div className="mt-2 space-y-2">
            {classificationResults.items.map((item, index) => {
              if (removedItems.has(index)) return null;
              return (
                <div
                  key={`${item.domaine_id}-${index}`}
                  className="bg-white/80 rounded-md border border-slate-200 p-2 relative"
                >
                  {/* Remove button */}
                  {classificationResults.items.length > 1 && (
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="absolute top-1.5 right-1.5 p-0.5 text-slate-300 hover:text-red-500 transition-colors"
                      title="Retirer ce domaine"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}

                  {/* Domain badge */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full font-medium">
                      {item.domaine_nom}
                    </span>
                  </div>

                  {/* Editable observation */}
                  <textarea
                    value={getObservationText(item, index)}
                    onChange={(e) => handleEditText(index, e.target.value)}
                    className="w-full text-sm text-slate-700 bg-white px-2 py-1.5 rounded border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none resize-none transition-colors"
                    rows={2}
                  />

                  {/* Previous observation (if exists) */}
                  {item.observation_before && (
                    <div className="mt-1">
                      <p className="text-xs text-slate-400 italic">
                        Precedent : {item.observation_before}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleValidateAll}
                disabled={saving || activeItemCount === 0}
                className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-md transition-colors"
              >
                {saving
                  ? 'Enregistrement...'
                  : activeItemCount > 1
                    ? `Valider tout (${activeItemCount})`
                    : 'Valider'}
              </button>
              <button
                onClick={handleReject}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-md transition-colors"
              >
                Rejeter
              </button>
              {classificationResults.duration_ms > 0 && (
                <span className="text-xs text-slate-400 ml-auto">
                  {(classificationResults.duration_ms / 1000).toFixed(1)}s
                </span>
              )}
            </div>
          </div>
        )}

        {/* State: error */}
        {state === 'error' && error && (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={handleReject}
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
