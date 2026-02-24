import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { PedagogicalEvent, NewEvent, EventFilter, EventType } from '../types';

interface EventStore {
  events: PedagogicalEvent[];
  isLoading: boolean;
  error: string | null;

  // Chargement avec filtres combinables
  loadEvents: (filter: EventFilter) => Promise<void>;

  // INSERT only — pas d'update ni delete (event sourcing, ADR-014)
  addEvent: (event: NewEvent) => Promise<number | null>;

  // Helpers
  clearEvents: () => void;
}

export const useEventStore = create<EventStore>((set) => ({
  events: [],
  isLoading: false,
  error: null,

  loadEvents: async (filter: EventFilter) => {
    set({ isLoading: true, error: null });
    try {
      // Transformer camelCase TS → snake_case Rust
      const rustFilter: Record<string, unknown> = {};
      if (filter.eleveId !== undefined) rustFilter.eleve_id = filter.eleveId;
      if (filter.anneeScolaireId !== undefined) rustFilter.annee_scolaire_id = filter.anneeScolaireId;
      if (filter.periodeId !== undefined) rustFilter.periode_id = filter.periodeId;
      if (filter.domaineId !== undefined) rustFilter.domaine_id = filter.domaineId;
      if (filter.eventType !== undefined) rustFilter.event_type = filter.eventType;

      const rows = await invoke<RawEvent[]>('load_events', { filter: rustFilter });

      const events: PedagogicalEvent[] = rows.map(mapRawEvent);
      set({ events, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  addEvent: async (event: NewEvent) => {
    try {
      // Transformer camelCase TS → snake_case Rust
      const rustEvent = {
        eleve_id: event.eleveId,
        annee_scolaire_id: event.anneeScolaireId,
        periode_id: event.periodeId,
        type: event.type,
        domaine_id: event.domaineId,
        lecon: event.lecon,
        niveau_lsu: event.niveauLsu,
        observations: event.observations,
        texte_dictation: event.texteDictation,
        source: event.source,
      };

      const id = await invoke<number>('add_event', { event: rustEvent });
      return id;
    } catch (error) {
      set({ error: String(error) });
      return null;
    }
  },

  clearEvents: () => {
    set({ events: [], error: null });
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Raw row mapping (snake_case DB → camelCase TS)
// ─────────────────────────────────────────────────────────────────────────────

interface RawEvent {
  id: number;
  uuid: string;
  eleve_id: number;
  annee_scolaire_id: number;
  periode_id: number | null;
  type: EventType;
  domaine_id: number | null;
  lecon: string | null;
  niveau_lsu: string | null;
  observations: string | null;
  texte_dictation: string | null;
  source: string;
  created_at: string;
  synced_at: string | null;
}

function mapRawEvent(r: RawEvent): PedagogicalEvent {
  return {
    id: r.id,
    uuid: r.uuid,
    eleveId: r.eleve_id,
    anneeScolaireId: r.annee_scolaire_id,
    periodeId: r.periode_id,
    type: r.type,
    domaineId: r.domaine_id,
    lecon: r.lecon,
    niveauLsu: r.niveau_lsu as PedagogicalEvent['niveauLsu'],
    observations: r.observations,
    texteDictation: r.texte_dictation,
    source: r.source as PedagogicalEvent['source'],
    createdAt: r.created_at,
    syncedAt: r.synced_at,
  };
}
