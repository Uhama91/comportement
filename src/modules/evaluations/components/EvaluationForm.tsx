// Story 24.1 — Formulaire saisie evaluation individuelle
// Lecon, domaine filtre par cycle, niveau LSU 4 niveaux, observations

import { useState, useMemo, useCallback } from 'react';
import { useEventStore } from '../../../shared/stores/eventStore';
import { useAppreciationStore } from '../../../shared/stores/appreciationStore';
import { useAnneeStore } from '../../../shared/stores/anneeStore';
import { useConfigStore } from '../../../shared/stores/configStore';
import { NIVEAU_TO_CYCLE } from '../../../shared/types/domaines-officiels';
import type { NiveauLsu, NiveauCode, StudentWithSanctions } from '../../../shared/types';

interface EvaluationFormProps {
  student: StudentWithSanctions;
  onDone: () => void;
}

const NIVEAUX: Array<{ value: NiveauLsu; label: string; color: string }> = [
  { value: 'depasses', label: 'Depasses', color: 'bg-blue-500 text-white' },
  { value: 'atteints', label: 'Atteints', color: 'bg-green-500 text-white' },
  { value: 'partiellement_atteints', label: 'Partiellement', color: 'bg-amber-500 text-white' },
  { value: 'non_atteints', label: 'Non atteints', color: 'bg-red-500 text-white' },
];

export function EvaluationForm({ student, onDone }: EvaluationFormProps) {
  const { addEvent } = useEventStore();
  const { domaines } = useAppreciationStore();
  const activeAnnee = useAnneeStore((s) => s.activeAnnee);
  const activePeriode = useConfigStore((s) => s.activePeriode);

  const [lecon, setLecon] = useState('');
  const [domaineId, setDomaineId] = useState<number | null>(null);
  const [niveauLsu, setNiveauLsu] = useState<NiveauLsu | null>(null);
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);

  // Filter domaines by student's cycle
  const cycle = student.niveau ? NIVEAU_TO_CYCLE[student.niveau as NiveauCode] : null;
  const filteredDomaines = useMemo(() => {
    if (!cycle) return domaines; // show all if no cycle info
    // For now, return all domaines (they are not cycle-tagged in DB yet)
    // In a future iteration, filter by cycle
    return domaines;
  }, [domaines, cycle]);

  const handleSubmit = useCallback(async () => {
    if (!activeAnnee || !domaineId || !niveauLsu) return;
    setSaving(true);
    try {
      await addEvent({
        eleveId: student.id,
        anneeScolaireId: activeAnnee.id,
        periodeId: activePeriode?.id ?? null,
        type: 'evaluation',
        domaineId,
        lecon: lecon.trim() || null,
        niveauLsu,
        observations: observations.trim() || null,
        texteDictation: null,
        source: 'manual',
      });
      onDone();
    } catch (e) {
      console.error('Erreur saisie evaluation:', e);
    } finally {
      setSaving(false);
    }
  }, [activeAnnee, activePeriode, student.id, domaineId, lecon, niveauLsu, observations, addEvent, onDone]);

  return (
    <div className="p-3 space-y-3">
      <h3 className="text-sm font-bold text-slate-700">
        Evaluation — {student.firstName}
        {student.niveau && <span className="ml-1 text-xs text-slate-400">({student.niveau})</span>}
      </h3>

      {/* Lecon */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Lecon evaluee</label>
        <input
          type="text"
          value={lecon}
          onChange={(e) => setLecon(e.target.value)}
          placeholder="Ex: Les fractions decimales"
          className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none"
        />
      </div>

      {/* Domaine */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Domaine</label>
        <select
          value={domaineId ?? ''}
          onChange={(e) => setDomaineId(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none"
        >
          <option value="">Selectionner un domaine...</option>
          {filteredDomaines.map((d) => (
            <option key={d.id} value={d.id}>{d.nom}</option>
          ))}
        </select>
      </div>

      {/* Niveau LSU */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Niveau</label>
        <div className="flex gap-1.5">
          {NIVEAUX.map((n) => (
            <button
              key={n.value}
              onClick={() => setNiveauLsu(n.value)}
              className={`
                flex-1 px-1.5 py-2 text-xs font-medium rounded transition-all
                ${niveauLsu === n.value
                  ? `${n.color} ring-2 ring-offset-1 ring-slate-300`
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }
              `}
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>

      {/* Observations */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Observations (optionnel)
        </label>
        <textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          placeholder="Commentaire sur l'evaluation..."
          className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none resize-none"
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSubmit}
          disabled={saving || !domaineId || !niveauLsu}
          className="flex-1 px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded transition-colors"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button
          onClick={onDone}
          disabled={saving}
          className="px-3 py-2 text-xs text-slate-600 hover:text-slate-800 transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
