// Story 23.1 — Grille d'appel eleves x jours (semaine en cours)
// Chaque cellule a matin + apres-midi, clic toggle absence

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAbsenceStore } from '../../../shared/stores/absenceStore';
import { useStudentStore } from '../../../shared/stores/studentStore';
import { useAnneeStore } from '../../../shared/stores/anneeStore';
import { AbsenceDetailModal } from './AbsenceDetailModal';
import type { DemiJournee, TypeAbsence, AbsenceV2 } from '../../../shared/types';

interface AttendanceGridProps {
  weekStart: string; // YYYY-MM-DD (lundi)
  weekEnd: string;   // YYYY-MM-DD (vendredi)
}

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];

const TYPE_COLORS: Record<TypeAbsence, string> = {
  injustifiee: 'bg-red-500 text-white',
  justifiee: 'bg-amber-400 text-white',
  medicale: 'bg-blue-400 text-white',
};

const TYPE_LABELS: Record<TypeAbsence, string> = {
  injustifiee: 'I',
  justifiee: 'J',
  medicale: 'M',
};

export function AttendanceGrid({ weekStart, weekEnd }: AttendanceGridProps) {
  const [detailAbsence, setDetailAbsence] = useState<{ absence: AbsenceV2; studentName: string } | null>(null);
  const { students, loadStudents } = useStudentStore();
  const activeAnnee = useAnneeStore((s) => s.activeAnnee);
  const { absences, alerts, loadAbsences, toggleAbsence, computeAlerts } = useAbsenceStore();

  // Load students + absences
  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    if (activeAnnee) {
      loadAbsences(activeAnnee.id, weekStart, weekEnd);
      const today = new Date().toISOString().split('T')[0];
      computeAlerts(activeAnnee.id, today);
    }
  }, [activeAnnee, weekStart, weekEnd, loadAbsences, computeAlerts]);

  // Build week days array from weekStart
  const weekDays = useMemo(() => {
    const days: string[] = [];
    const start = new Date(weekStart + 'T00:00:00');
    for (let i = 0; i < 5; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, [weekStart]);

  // Index absences by key
  const absenceMap = useMemo(() => {
    const map = new Map<string, AbsenceV2>();
    for (const a of absences) {
      map.set(`${a.eleveId}-${a.date}-${a.demiJournee}`, a);
    }
    return map;
  }, [absences]);

  // Alert set
  const alertSet = useMemo(() => new Set(alerts.map((a) => a.eleveId)), [alerts]);

  const handleToggle = useCallback(
    (eleveId: number, date: string, demiJournee: DemiJournee) => {
      if (!activeAnnee) return;
      toggleAbsence({
        eleveId,
        date,
        demiJournee,
        anneeScolaireId: activeAnnee.id,
      });
    },
    [activeAnnee, toggleAbsence]
  );

  // Sorted students by firstName
  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => a.firstName.localeCompare(b.firstName)),
    [students]
  );

  if (!activeAnnee) {
    return (
      <div className="p-4 text-center text-slate-500">
        Aucune annee scolaire active. Creez-en une dans les parametres.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className="sticky left-0 bg-slate-50 z-10 px-3 py-2 text-left font-medium text-slate-600 border-b min-w-[120px]">
              Eleve
            </th>
            {weekDays.map((date, i) => (
              <th
                key={date}
                className="px-1 py-2 text-center font-medium text-slate-600 border-b min-w-[80px]"
              >
                <div>{JOURS[i]}</div>
                <div className="text-[10px] text-slate-400 font-normal">
                  {date.slice(8)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedStudents.map((student) => (
            <tr
              key={student.id}
              className="border-b border-slate-100 hover:bg-slate-50/50"
            >
              <td className="sticky left-0 bg-white z-10 px-3 py-1.5 font-medium text-slate-800">
                <div className="flex items-center gap-1.5">
                  {student.firstName}
                  {alertSet.has(student.id) && (
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded"
                      title="4+ demi-journees injustifiees sur 30 jours"
                    >
                      ALERTE
                    </span>
                  )}
                </div>
              </td>
              {weekDays.map((date) => (
                <td key={date} className="px-1 py-1">
                  <div className="flex gap-0.5 justify-center">
                    {(['matin', 'apres_midi'] as DemiJournee[]).map((demi) => {
                      const key = `${student.id}-${date}-${demi}`;
                      const absence = absenceMap.get(key);
                      const isAbsent = !!absence && !absence.retard;
                      const isRetard = !!absence && absence.retard;

                      return (
                        <button
                          key={demi}
                          onClick={() => {
                            if (isAbsent || isRetard) {
                              // Open detail modal
                              setDetailAbsence({ absence: absence!, studentName: student.firstName });
                            } else {
                              // Toggle absent
                              handleToggle(student.id, date, demi);
                            }
                          }}
                          className={`
                            w-8 h-7 rounded text-[10px] font-medium transition-all
                            ${isAbsent
                              ? TYPE_COLORS[absence!.typeAbsence]
                              : isRetard
                                ? 'bg-purple-200 text-purple-700'
                                : 'bg-green-50 text-green-600 hover:bg-green-100'
                            }
                          `}
                          title={`${demi === 'matin' ? 'Matin' : 'Apres-midi'}${absence?.motif ? ` — ${absence.motif}` : ''}`}
                        >
                          {isAbsent
                            ? TYPE_LABELS[absence!.typeAbsence]
                            : isRetard
                              ? 'R'
                              : demi === 'matin'
                                ? 'M'
                                : 'A'}
                        </button>
                      );
                    })}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Detail modal */}
      {detailAbsence && (
        <AbsenceDetailModal
          absence={detailAbsence.absence}
          studentName={detailAbsence.studentName}
          onClose={() => setDetailAbsence(null)}
        />
      )}
    </div>
  );
}
