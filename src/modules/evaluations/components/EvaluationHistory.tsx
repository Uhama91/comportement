// Story 24.3 — Timeline chronologique evaluations par eleve

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useEventStore } from '../../../shared/stores/eventStore';
import { useAppreciationStore } from '../../../shared/stores/appreciationStore';
import { useAnneeStore } from '../../../shared/stores/anneeStore';
import { useConfigStore } from '../../../shared/stores/configStore';
import type { PedagogicalEvent, NiveauLsu, StudentWithSanctions } from '../../../shared/types';

interface EvaluationHistoryProps {
  student: StudentWithSanctions;
}

const NIVEAU_BADGE: Record<NiveauLsu, { label: string; color: string }> = {
  depasses: { label: 'Depasses', color: 'bg-blue-100 text-blue-700' },
  atteints: { label: 'Atteints', color: 'bg-green-100 text-green-700' },
  partiellement_atteints: { label: 'Partiellement', color: 'bg-amber-100 text-amber-700' },
  non_atteints: { label: 'Non atteints', color: 'bg-red-100 text-red-700' },
};

export function EvaluationHistory({ student }: EvaluationHistoryProps) {
  const { events, loadEvents } = useEventStore();
  const { domaines } = useAppreciationStore();
  const activeAnnee = useAnneeStore((s) => s.activeAnnee);
  const { periodes } = useConfigStore();

  const [filterDomaineId, setFilterDomaineId] = useState<number | null>(null);
  const [filterPeriodeId, setFilterPeriodeId] = useState<number | null>(null);

  // Load evaluations for this student
  const loadData = useCallback(() => {
    if (!activeAnnee) return;
    const filter: Record<string, unknown> = {
      eleveId: student.id,
      anneeScolaireId: activeAnnee.id,
      eventType: 'evaluation',
    };
    if (filterDomaineId) filter.domaineId = filterDomaineId;
    if (filterPeriodeId) filter.periodeId = filterPeriodeId;
    loadEvents(filter as any);
  }, [activeAnnee, student.id, filterDomaineId, filterPeriodeId, loadEvents]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Map domaine ids to names
  const domaineMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const d of domaines) m.set(d.id, d.nom);
    return m;
  }, [domaines]);

  const evaluations = events.filter((e) => e.type === 'evaluation');

  return (
    <div className="p-3">
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-sm font-bold text-slate-700">
          Historique — {student.firstName}
        </h3>
        <span className="text-xs text-slate-400">
          {evaluations.length} evaluation{evaluations.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-3">
        <select
          value={filterDomaineId ?? ''}
          onChange={(e) => setFilterDomaineId(e.target.value ? Number(e.target.value) : null)}
          className="text-xs px-2 py-1 border border-slate-200 rounded"
        >
          <option value="">Tous domaines</option>
          {domaines.map((d) => (
            <option key={d.id} value={d.id}>{d.nom}</option>
          ))}
        </select>
        <select
          value={filterPeriodeId ?? ''}
          onChange={(e) => setFilterPeriodeId(e.target.value ? Number(e.target.value) : null)}
          className="text-xs px-2 py-1 border border-slate-200 rounded"
        >
          <option value="">Toutes periodes</option>
          {periodes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nomAffichage || `Periode ${p.numero}`}
            </option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      {evaluations.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">Aucune evaluation trouvee.</p>
      ) : (
        <div className="space-y-2">
          {evaluations.map((ev) => (
            <EvalCard key={ev.id} event={ev} domaineMap={domaineMap} />
          ))}
        </div>
      )}
    </div>
  );
}

function EvalCard({
  event,
  domaineMap,
}: {
  event: PedagogicalEvent;
  domaineMap: Map<number, string>;
}) {
  const niveau = event.niveauLsu ? NIVEAU_BADGE[event.niveauLsu] : null;
  const domaineName = event.domaineId ? domaineMap.get(event.domaineId) ?? '?' : '—';
  const date = event.createdAt.split('T')[0] || event.createdAt.slice(0, 10);

  return (
    <div className="flex items-start gap-3 p-2 bg-white rounded border border-slate-100">
      {/* Date */}
      <div className="text-[10px] text-slate-400 w-16 flex-shrink-0 pt-0.5">{date}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-slate-700">{domaineName}</span>
          {niveau && (
            <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${niveau.color}`}>
              {niveau.label}
            </span>
          )}
        </div>
        {event.lecon && (
          <p className="text-xs text-slate-500 italic">{event.lecon}</p>
        )}
        {event.observations && (
          <p className="text-xs text-slate-600 mt-0.5">{event.observations}</p>
        )}
      </div>
    </div>
  );
}
