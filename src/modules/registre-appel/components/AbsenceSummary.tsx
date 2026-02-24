// Story 23.3 — Totaux absences par periode pour LSU
// Affiche justifiees + injustifiees separement par eleve

import { useState, useEffect, useCallback } from 'react';
import { useAbsenceStore } from '../../../shared/stores/absenceStore';
import { useStudentStore } from '../../../shared/stores/studentStore';
import { useAnneeStore } from '../../../shared/stores/anneeStore';
import { useConfigStore } from '../../../shared/stores/configStore';
import type { AbsenceTotaux } from '../../../shared/types';

export function AbsenceSummary() {
  const { students } = useStudentStore();
  const activeAnnee = useAnneeStore((s) => s.activeAnnee);
  const { periodes, activePeriode } = useConfigStore();
  const { computeTotaux } = useAbsenceStore();
  const [totaux, setTotaux] = useState<AbsenceTotaux[]>([]);
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<number | null>(null);

  const periodeId = selectedPeriodeId ?? activePeriode?.id ?? null;
  const periode = periodes.find((p) => p.id === periodeId);

  const loadTotaux = useCallback(async () => {
    if (!activeAnnee || !periode) return;
    const result = await computeTotaux(activeAnnee.id, periode.dateDebut, periode.dateFin);
    setTotaux(result);
  }, [activeAnnee, periode, computeTotaux]);

  useEffect(() => {
    loadTotaux();
  }, [loadTotaux]);

  const sortedStudents = [...students].sort((a, b) => a.firstName.localeCompare(b.firstName));

  const getTotaux = (eleveId: number) => totaux.find((t) => t.eleveId === eleveId);

  return (
    <div className="p-3">
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-sm font-bold text-slate-700">Totaux par periode</h3>
        <select
          value={periodeId ?? ''}
          onChange={(e) => setSelectedPeriodeId(e.target.value ? Number(e.target.value) : null)}
          className="text-xs px-2 py-1 border border-slate-200 rounded"
        >
          {periodes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nomAffichage || `Periode ${p.numero}`}
            </option>
          ))}
        </select>
      </div>

      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className="px-3 py-1.5 text-left font-medium text-slate-600 border-b">Eleve</th>
            <th className="px-3 py-1.5 text-center font-medium text-amber-600 border-b">Justifiees</th>
            <th className="px-3 py-1.5 text-center font-medium text-red-600 border-b">Injustifiees</th>
            <th className="px-3 py-1.5 text-center font-medium text-slate-600 border-b">Total</th>
          </tr>
        </thead>
        <tbody>
          {sortedStudents.map((student) => {
            const t = getTotaux(student.id);
            const just = t?.justifiees ?? 0;
            const injust = t?.injustifiees ?? 0;
            const total = just + injust;

            return (
              <tr key={student.id} className="border-b border-slate-100">
                <td className="px-3 py-1.5 font-medium text-slate-800">{student.firstName}</td>
                <td className="px-3 py-1.5 text-center">
                  {just > 0 ? (
                    <span className="text-amber-600 font-medium">{just}</span>
                  ) : (
                    <span className="text-slate-300">0</span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-center">
                  {injust > 0 ? (
                    <span className="text-red-600 font-medium">{injust}</span>
                  ) : (
                    <span className="text-slate-300">0</span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-center">
                  {total > 0 ? (
                    <span className="font-medium text-slate-700">{total}</span>
                  ) : (
                    <span className="text-slate-300">0</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
