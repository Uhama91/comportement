// Module LSU Vivant (Epic 25)
// Double vue par eleve / par domaine avec syntheses et sources depliables

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useStudentStore } from '../../shared/stores/studentStore';
import { useAppreciationStore } from '../../shared/stores/appreciationStore';
import { useAnneeStore } from '../../shared/stores/anneeStore';
import { useConfigStore } from '../../shared/stores/configStore';
import { useSyntheseStore } from '../../shared/stores/syntheseStore';
import { NIVEAU_TO_CYCLE } from '../../shared/types/domaines-officiels';
import type { StudentWithSanctions } from '../../shared/types';
import type { NiveauCode } from '../../shared/types';
import type { Domaine } from '../../shared/stores/appreciationStore';
import StudentSynthesisView from './components/StudentSynthesisView';

type Tab = 'par-eleve' | 'par-domaine';

// Raw synthese from invoke
interface RawSynthese {
  id: number;
  eleve_id: number;
  domaine_id: number;
  periode_id: number;
  annee_scolaire_id: number;
  version: number;
  texte: string;
  generated_by: string;
  created_at: string;
}

// Per-student synthese snapshot for domain view
interface StudentSyntheseEntry {
  student: StudentWithSanctions;
  synthese: RawSynthese | null;
  isLoading: boolean;
}

export default function LsuVivantModule() {
  const { students, loadStudents } = useStudentStore();
  const { domaines, loadDomaines } = useAppreciationStore();
  const { activeAnnee } = useAnneeStore();
  const { activePeriode } = useConfigStore();

  const [tab, setTab] = useState<Tab>('par-eleve');
  const [selectedStudent, setSelectedStudent] = useState<StudentWithSanctions | null>(null);
  const [selectedDomaine, setSelectedDomaine] = useState<Domaine | null>(null);

  // Domain view: per-student synthese snapshots
  const [domainStudentEntries, setDomainStudentEntries] = useState<StudentSyntheseEntry[]>([]);

  useEffect(() => {
    loadStudents();
    loadDomaines(); // load all domaines
  }, [loadStudents, loadDomaines]);

  const sortedStudents = [...students].sort((a, b) =>
    a.firstName.localeCompare(b.firstName)
  );

  // Auto-select first student / first domain
  useEffect(() => {
    if (sortedStudents.length > 0 && !selectedStudent) {
      setSelectedStudent(sortedStudents[0]);
    }
  }, [sortedStudents.length]);

  useEffect(() => {
    if (domaines.length > 0 && !selectedDomaine) {
      setSelectedDomaine(domaines.find((d) => d.actif) ?? null);
    }
  }, [domaines.length]);

  // When selected domain changes in par-domaine tab, load syntheses for eligible students
  useEffect(() => {
    if (tab !== 'par-domaine' || !selectedDomaine || !activePeriode || !activeAnnee) return;

    const domainCycle = selectedDomaine.cycle;
    const eligible = sortedStudents.filter((s) => {
      if (!domainCycle) return true; // domaine sans cycle specifique → tous
      if (!s.niveau) return false;
      const studentCycle = NIVEAU_TO_CYCLE[s.niveau as NiveauCode];
      return studentCycle === domainCycle;
    });

    const entries: StudentSyntheseEntry[] = eligible.map((s) => ({
      student: s,
      synthese: null,
      isLoading: true,
    }));
    setDomainStudentEntries(entries);

    // Load synthese for each student
    eligible.forEach(async (s, idx) => {
      try {
        const raw = await invoke<RawSynthese | null>('load_synthese_current', {
          eleveId: s.id,
          domaineId: selectedDomaine.id,
          periodeId: activePeriode.id,
          anneeScolaireId: activeAnnee.id,
        });
        setDomainStudentEntries((prev) => {
          const next = [...prev];
          if (next[idx]) {
            next[idx] = { ...next[idx], synthese: raw, isLoading: false };
          }
          return next;
        });
      } catch {
        setDomainStudentEntries((prev) => {
          const next = [...prev];
          if (next[idx]) {
            next[idx] = { ...next[idx], isLoading: false };
          }
          return next;
        });
      }
    });
  }, [tab, selectedDomaine?.id, activePeriode?.id, activeAnnee?.id, students.length]);

  const periodeId = activePeriode?.id ?? 0;
  const anneeScolaireId = activeAnnee?.id ?? 0;

  const noContextMsg =
    !activePeriode || !activeAnnee ? (
      <div className="flex items-center justify-center h-full text-xs text-slate-400">
        Configurez une année scolaire et une période active.
      </div>
    ) : null;

  const activeDomaines = domaines.filter((d) => d.actif);

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex items-center gap-0 px-4 pt-2 flex-shrink-0">
        {([
          { id: 'par-eleve' as Tab, label: 'Par élève' },
          { id: 'par-domaine' as Tab, label: 'Par domaine' },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition-colors ${
              tab === t.id
                ? 'border-blue-500 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {/* ── Vue par élève ── */}
        {tab === 'par-eleve' && (
          <div className="flex h-full">
            {/* Student list */}
            <div className="w-[180px] border-r border-slate-200 overflow-y-auto flex-shrink-0">
              {sortedStudents.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  className={`
                    w-full px-3 py-2 text-xs text-left transition-colors
                    ${selectedStudent?.id === s.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                    }
                  `}
                >
                  {s.firstName}
                  {s.niveau && (
                    <span className="ml-1 text-slate-400">({s.niveau})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 overflow-hidden">
              {noContextMsg ?? (
                selectedStudent ? (
                  <StudentSynthesisView
                    key={selectedStudent.id}
                    student={selectedStudent}
                    periodeId={periodeId}
                    anneeScolaireId={anneeScolaireId}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-slate-400">
                    Sélectionner un élève
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* ── Vue par domaine ── */}
        {tab === 'par-domaine' && (
          <div className="flex h-full">
            {/* Domain list */}
            <div className="w-[180px] border-r border-slate-200 overflow-y-auto flex-shrink-0">
              {activeDomaines.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDomaine(d)}
                  className={`
                    w-full px-3 py-2 text-xs text-left transition-colors
                    ${selectedDomaine?.id === d.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                    }
                  `}
                >
                  {d.nom}
                  {d.cycle && (
                    <span className="ml-1 text-slate-400">(C{d.cycle})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 overflow-y-auto">
              {noContextMsg ?? (
                selectedDomaine ? (
                  <div className="p-4 space-y-3">
                    <h2 className="font-semibold text-slate-800 text-sm">
                      {selectedDomaine.nom}
                      {selectedDomaine.cycle && (
                        <span className="ml-2 text-xs text-slate-400 font-normal">
                          Cycle {selectedDomaine.cycle}
                        </span>
                      )}
                    </h2>

                    {domainStudentEntries.length === 0 && (
                      <p className="text-xs text-slate-400 italic">
                        Aucun élève de ce cycle dans la classe.
                      </p>
                    )}

                    {domainStudentEntries.map(({ student, synthese, isLoading }) => (
                      <div
                        key={student.id}
                        className="border border-slate-200 rounded-lg p-3 flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-700">
                            {student.firstName}
                            {student.niveau && (
                              <span className="ml-1 text-slate-400 font-normal">
                                ({student.niveau})
                              </span>
                            )}
                          </span>
                          {synthese && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              {synthese.generated_by === 'llm' ? 'IA' : 'Manuel'} · v{synthese.version}
                            </span>
                          )}
                        </div>

                        {isLoading ? (
                          <p className="text-xs text-slate-400 italic">Chargement…</p>
                        ) : synthese ? (
                          <p className="text-xs text-slate-600 line-clamp-3 whitespace-pre-wrap">
                            {synthese.texte}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            Pas de synthèse — aller dans "Par élève" pour en générer une.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-slate-400">
                    Sélectionner un domaine
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
