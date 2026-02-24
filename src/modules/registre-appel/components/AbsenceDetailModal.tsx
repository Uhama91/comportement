// Story 23.2 — Modal details absence: type, motif, retard
// Opens when clicking an absent cell to edit details

import { useState, useCallback } from 'react';
import { useAbsenceStore } from '../../../shared/stores/absenceStore';
import type { AbsenceV2, TypeAbsence } from '../../../shared/types';

interface AbsenceDetailModalProps {
  absence: AbsenceV2;
  studentName: string;
  onClose: () => void;
}

const TYPES: Array<{ value: TypeAbsence; label: string; color: string }> = [
  { value: 'injustifiee', label: 'Injustifiee', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'justifiee', label: 'Justifiee', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'medicale', label: 'Medicale', color: 'bg-blue-100 text-blue-700 border-blue-300' },
];

export function AbsenceDetailModal({ absence, studentName, onClose }: AbsenceDetailModalProps) {
  const { updateType, updateMotif, toggleRetard } = useAbsenceStore();
  const [motifText, setMotifText] = useState(absence.motif ?? '');
  const [saving, setSaving] = useState(false);

  const handleTypeChange = useCallback(
    async (type: TypeAbsence) => {
      await updateType(absence.id, type);
    },
    [absence.id, updateType]
  );

  const handleSaveMotif = useCallback(async () => {
    setSaving(true);
    await updateMotif(absence.id, motifText.trim());
    setSaving(false);
  }, [absence.id, motifText, updateMotif]);

  const handleToggleRetard = useCallback(async () => {
    await toggleRetard(
      absence.eleveId,
      absence.date,
      absence.demiJournee,
      absence.anneeScolaireId
    );
    onClose();
  }, [absence, toggleRetard, onClose]);

  const demiLabel = absence.demiJournee === 'matin' ? 'Matin' : 'Apres-midi';

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-sm font-bold text-slate-800 mb-3">
            {studentName} — {absence.date} ({demiLabel})
          </h3>

          {/* Type selection */}
          <div className="mb-3">
            <p className="text-xs font-medium text-slate-600 mb-1.5">Type d'absence</p>
            <div className="flex gap-1.5">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleTypeChange(t.value)}
                  className={`
                    flex-1 px-2 py-1.5 text-xs font-medium rounded border transition-all
                    ${absence.typeAbsence === t.value
                      ? `${t.color} ring-2 ring-offset-1 ring-slate-300`
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }
                  `}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Motif */}
          <div className="mb-3">
            <p className="text-xs font-medium text-slate-600 mb-1">Motif</p>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={motifText}
                onChange={(e) => setMotifText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveMotif()}
                placeholder="Motif de l'absence..."
                className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none"
              />
              <button
                onClick={handleSaveMotif}
                disabled={saving}
                className="px-2 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded transition-colors"
              >
                {saving ? '...' : 'OK'}
              </button>
            </div>
          </div>

          {/* Retard toggle */}
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-600">Retard (present, pas absent)</p>
              <p className="text-[10px] text-slate-400">Ne compte pas comme absence</p>
            </div>
            <button
              onClick={handleToggleRetard}
              className={`
                px-3 py-1.5 text-xs font-medium rounded transition-colors
                ${absence.retard
                  ? 'bg-purple-500 text-white hover:bg-purple-600'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }
              `}
            >
              {absence.retard ? 'Retard' : 'Marquer retard'}
            </button>
          </div>

          {/* Close */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
