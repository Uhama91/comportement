import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { PedagogicalEvent, EventFilter } from '../../../shared/types';

interface SourcesAccordionProps {
  eleveId: number;
  domaineId: number;
  periodeId: number;
  anneeScolaireId: number;
}

interface RawEvent {
  id: number;
  uuid: string;
  eleve_id: number;
  annee_scolaire_id: number;
  periode_id: number | null;
  type: string;
  domaine_id: number | null;
  lecon: string | null;
  niveau_lsu: string | null;
  observations: string | null;
  texte_dictation: string | null;
  source: string;
  created_at: string;
  synced_at: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

const NIVEAU_LABELS: Record<string, string> = {
  'tres_bonne_maitrise': 'TBM',
  'bonne_maitrise': 'BM',
  'maitrise_fragile': 'MF',
  'maitrise_insuffisante': 'MI',
};

export default function SourcesAccordion({
  eleveId,
  domaineId,
  periodeId,
  anneeScolaireId,
}: SourcesAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState<PedagogicalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleToggle = async () => {
    if (!isOpen && !loaded) {
      setIsLoading(true);
      try {
        const filter: Record<string, unknown> = {
          eleve_id: eleveId,
          domaine_id: domaineId,
          periode_id: periodeId,
          annee_scolaire_id: anneeScolaireId,
        };
        const rows = await invoke<RawEvent[]>('load_events', { filter });
        const mapped: PedagogicalEvent[] = rows.map((r) => ({
          id: r.id,
          uuid: r.uuid,
          eleveId: r.eleve_id,
          anneeScolaireId: r.annee_scolaire_id,
          periodeId: r.periode_id,
          type: r.type as PedagogicalEvent['type'],
          domaineId: r.domaine_id,
          lecon: r.lecon,
          niveauLsu: r.niveau_lsu as PedagogicalEvent['niveauLsu'],
          observations: r.observations,
          texteDictation: r.texte_dictation,
          source: r.source as PedagogicalEvent['source'],
          createdAt: r.created_at,
          syncedAt: r.synced_at,
        }));
        setEvents(mapped);
        setLoaded(true);
      } finally {
        setIsLoading(false);
      }
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="border-t border-slate-100 mt-2 pt-2">
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
      >
        <span className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
        {isLoading ? 'Chargement...' : `Sources (${loaded ? events.length : '…'})`}
      </button>

      {isOpen && (
        <div className="mt-2 space-y-1.5">
          {events.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Aucune source disponible.</p>
          ) : (
            events.map((ev) => (
              <div key={ev.id} className="flex gap-2 text-xs p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-400 flex-shrink-0 w-12">{formatDate(ev.createdAt)}</span>
                <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${
                  ev.type === 'observation'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {ev.type === 'observation' ? 'Obs' : 'Eval'}
                </span>
                <div className="flex-1 min-w-0">
                  {ev.lecon && (
                    <span className="text-slate-500 mr-1">Leçon : {ev.lecon} —</span>
                  )}
                  {ev.niveauLsu && (
                    <span className="font-medium text-slate-600 mr-1">
                      [{NIVEAU_LABELS[ev.niveauLsu] ?? ev.niveauLsu}]
                    </span>
                  )}
                  <span className="text-slate-600">{ev.observations ?? '—'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
