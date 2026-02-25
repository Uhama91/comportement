import { useEffect } from 'react';
import { useAppreciationStore } from '../../../shared/stores/appreciationStore';
import { useSyntheseStore } from '../../../shared/stores/syntheseStore';
import { NIVEAU_TO_CYCLE } from '../../../shared/types/domaines-officiels';
import type { StudentWithSanctions } from '../../../shared/types';
import type { NiveauCode } from '../../../shared/types';
import SynthesisCard from './SynthesisCard';

interface StudentSynthesisViewProps {
  student: StudentWithSanctions;
  periodeId: number;
  anneeScolaireId: number;
}

export default function StudentSynthesisView({
  student,
  periodeId,
  anneeScolaireId,
}: StudentSynthesisViewProps) {
  const { domaines, loadDomaines } = useAppreciationStore();
  const { loadForStudent, clearState } = useSyntheseStore();

  const cycle = student.niveau
    ? NIVEAU_TO_CYCLE[student.niveau as NiveauCode] ?? null
    : null;

  useEffect(() => {
    if (cycle !== null) {
      loadDomaines(cycle);
    } else {
      loadDomaines();
    }
  }, [cycle, loadDomaines]);

  useEffect(() => {
    clearState();
    if (domaines.length > 0) {
      const domaineIds = domaines.filter((d) => d.actif).map((d) => d.id);
      if (domaineIds.length > 0) {
        loadForStudent(student.id, periodeId, anneeScolaireId, domaineIds);
      }
    }
  }, [student.id, periodeId, anneeScolaireId, domaines, loadForStudent, clearState]);

  const activeDomaines = domaines.filter((d) => d.actif);

  const cycleLabel = cycle ? `Cycle ${cycle}` : 'Cycle non défini';
  const niveauLabel = student.niveau ?? '—';
  const fullName = student.firstName;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-slate-800">{fullName}</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
            {niveauLabel}
          </span>
          <span className="text-xs text-slate-400">{cycleLabel}</span>
        </div>
      </div>

      {/* Synthesis cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeDomaines.length === 0 && (
          <p className="text-sm text-slate-400 text-center mt-8">
            Aucun domaine actif pour ce cycle.
          </p>
        )}

        {activeDomaines.map((domaine) => (
          <SynthesisCard
            key={domaine.id}
            eleveId={student.id}
            domaineId={domaine.id}
            domaineNom={domaine.nom}
            periodeId={periodeId}
            anneeScolaireId={anneeScolaireId}
            studentName={fullName}
          />
        ))}

        {/* Appreciation générale — Story 25.4 placeholder */}
        <div className="border border-dashed border-slate-200 rounded-lg p-4 opacity-50">
          <p className="text-xs font-medium text-slate-500 mb-1">Appréciation générale</p>
          <p className="text-xs text-slate-400 italic">À venir (Story 25.4)</p>
        </div>
      </div>
    </div>
  );
}
