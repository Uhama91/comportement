// Story 24.2 — Saisie par lot : grille eleves x niveaux LSU pour une lecon

import { useState, useMemo, useCallback } from 'react';
import { useEventStore } from '../../../shared/stores/eventStore';
import { useStudentStore } from '../../../shared/stores/studentStore';
import { useAppreciationStore } from '../../../shared/stores/appreciationStore';
import { useAnneeStore } from '../../../shared/stores/anneeStore';
import { useConfigStore } from '../../../shared/stores/configStore';
import type { NiveauLsu } from '../../../shared/types';

const NIVEAUX: Array<{ value: NiveauLsu; label: string; short: string; color: string }> = [
  { value: 'depasses', label: 'Depasses', short: 'D', color: 'bg-blue-500 text-white' },
  { value: 'atteints', label: 'Atteints', short: 'A', color: 'bg-green-500 text-white' },
  { value: 'partiellement_atteints', label: 'Partiellement', short: 'PA', color: 'bg-amber-500 text-white' },
  { value: 'non_atteints', label: 'Non atteints', short: 'NA', color: 'bg-red-500 text-white' },
];

export function BatchEvaluation() {
  const { students } = useStudentStore();
  const { domaines } = useAppreciationStore();
  const { addEvent } = useEventStore();
  const activeAnnee = useAnneeStore((s) => s.activeAnnee);
  const activePeriode = useConfigStore((s) => s.activePeriode);

  const [lecon, setLecon] = useState('');
  const [domaineId, setDomaineId] = useState<number | null>(null);
  const [levels, setLevels] = useState<Record<number, NiveauLsu>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => a.firstName.localeCompare(b.firstName)),
    [students]
  );

  const handleSetLevel = useCallback((studentId: number, level: NiveauLsu) => {
    setLevels((prev) => {
      if (prev[studentId] === level) {
        // Toggle off
        const next = { ...prev };
        delete next[studentId];
        return next;
      }
      return { ...prev, [studentId]: level };
    });
  }, []);

  const assignedCount = Object.keys(levels).length;

  const handleSaveAll = useCallback(async () => {
    if (!activeAnnee || !domaineId || assignedCount === 0) return;
    setSaving(true);
    try {
      for (const [studentIdStr, niveau] of Object.entries(levels)) {
        await addEvent({
          eleveId: Number(studentIdStr),
          anneeScolaireId: activeAnnee.id,
          periodeId: activePeriode?.id ?? null,
          type: 'evaluation',
          domaineId,
          lecon: lecon.trim() || null,
          niveauLsu: niveau,
          observations: null,
          texteDictation: null,
          source: 'manual',
        });
      }
      setSaved(true);
      setLevels({});
      setLecon('');
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Erreur saisie par lot:', e);
    } finally {
      setSaving(false);
    }
  }, [activeAnnee, activePeriode, domaineId, lecon, levels, assignedCount, addEvent]);

  if (!activeAnnee) {
    return <div className="p-4 text-center text-slate-500">Aucune annee scolaire active.</div>;
  }

  return (
    <div className="p-3 space-y-3">
      {/* Header fields */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-600 mb-1">Lecon</label>
          <input
            type="text"
            value={lecon}
            onChange={(e) => setLecon(e.target.value)}
            placeholder="Ex: Les fractions decimales"
            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none"
          />
        </div>
        <div className="w-[200px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">Domaine</label>
          <select
            value={domaineId ?? ''}
            onChange={(e) => setDomaineId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none"
          >
            <option value="">Domaine...</option>
            {domaines.map((d) => (
              <option key={d.id} value={d.id}>{d.nom}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {domaineId && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-3 py-1.5 text-left font-medium text-slate-600 border-b">Eleve</th>
                {NIVEAUX.map((n) => (
                  <th key={n.value} className="px-2 py-1.5 text-center font-medium text-slate-600 border-b w-[80px]">
                    {n.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((student) => (
                <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-1 font-medium text-slate-800">
                    {student.firstName}
                    {student.niveau && <span className="ml-1 text-slate-400">({student.niveau})</span>}
                  </td>
                  {NIVEAUX.map((n) => {
                    const isSelected = levels[student.id] === n.value;
                    return (
                      <td key={n.value} className="px-2 py-1 text-center">
                        <button
                          onClick={() => handleSetLevel(student.id, n.value)}
                          className={`
                            w-full py-1.5 rounded text-[10px] font-medium transition-all
                            ${isSelected
                              ? `${n.color} ring-1 ring-offset-1 ring-slate-300`
                              : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                            }
                          `}
                        >
                          {isSelected ? n.short : '-'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Save */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSaveAll}
          disabled={saving || !domaineId || assignedCount === 0}
          className="px-4 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded transition-colors"
        >
          {saving
            ? 'Enregistrement...'
            : `Enregistrer (${assignedCount} eleve${assignedCount > 1 ? 's' : ''})`}
        </button>
        {saved && (
          <span className="text-xs text-green-600 font-medium">Enregistre !</span>
        )}
      </div>
    </div>
  );
}
