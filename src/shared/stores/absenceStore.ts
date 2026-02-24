import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { AbsenceV2, NewAbsenceV2, AbsenceAlert, AbsenceTotaux, DemiJournee, TypeAbsence } from '../types';

interface AbsenceStore {
  absences: AbsenceV2[];
  alerts: AbsenceAlert[];
  isLoading: boolean;
  error: string | null;

  loadAbsences: (anneeScolaireId: number, weekStart: string, weekEnd: string) => Promise<void>;
  toggleAbsence: (absence: NewAbsenceV2) => Promise<void>;
  updateType: (id: number, type: TypeAbsence) => Promise<void>;
  updateMotif: (id: number, motif: string) => Promise<void>;
  toggleRetard: (eleveId: number, date: string, demiJournee: DemiJournee, anneeScolaireId: number) => Promise<void>;
  computeAlerts: (anneeScolaireId: number, today: string) => Promise<void>;
  computeTotaux: (anneeScolaireId: number, dateDebut: string, dateFin: string) => Promise<AbsenceTotaux[]>;
}

interface RawAbsence {
  id: number;
  eleve_id: number;
  date: string;
  demi_journee: string;
  type_absence: string;
  motif: string | null;
  retard: boolean;
  annee_scolaire_id: number;
  created_at: string;
}

function mapRaw(r: RawAbsence): AbsenceV2 {
  return {
    id: r.id,
    eleveId: r.eleve_id,
    date: r.date,
    demiJournee: r.demi_journee as DemiJournee,
    typeAbsence: r.type_absence as TypeAbsence,
    motif: r.motif,
    retard: r.retard,
    anneeScolaireId: r.annee_scolaire_id,
    createdAt: r.created_at,
  };
}

// Store the last filter to allow auto-reload after mutations
let lastFilter: { anneeScolaireId: number; weekStart: string; weekEnd: string } | null = null;

export const useAbsenceStore = create<AbsenceStore>((set, get) => ({
  absences: [],
  alerts: [],
  isLoading: false,
  error: null,

  loadAbsences: async (anneeScolaireId, weekStart, weekEnd) => {
    lastFilter = { anneeScolaireId, weekStart, weekEnd };
    set({ isLoading: true, error: null });
    try {
      const rows = await invoke<RawAbsence[]>('load_absences_v2', {
        filter: {
          annee_scolaire_id: anneeScolaireId,
          week_start: weekStart,
          week_end: weekEnd,
        },
      });
      set({ absences: rows.map(mapRaw), isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  toggleAbsence: async (absence) => {
    try {
      await invoke('toggle_absence_v2', {
        absence: {
          eleve_id: absence.eleveId,
          date: absence.date,
          demi_journee: absence.demiJournee,
          type_absence: absence.typeAbsence ?? null,
          motif: absence.motif ?? null,
          retard: absence.retard ?? null,
          annee_scolaire_id: absence.anneeScolaireId,
        },
      });
      // Reload
      if (lastFilter) {
        await get().loadAbsences(lastFilter.anneeScolaireId, lastFilter.weekStart, lastFilter.weekEnd);
      }
    } catch (error) {
      set({ error: String(error) });
    }
  },

  updateType: async (id, type) => {
    try {
      await invoke('update_absence_type', { id, typeAbsence: type });
      if (lastFilter) {
        await get().loadAbsences(lastFilter.anneeScolaireId, lastFilter.weekStart, lastFilter.weekEnd);
      }
    } catch (error) {
      set({ error: String(error) });
    }
  },

  updateMotif: async (id, motif) => {
    try {
      await invoke('update_absence_motif', { id, motif });
      if (lastFilter) {
        await get().loadAbsences(lastFilter.anneeScolaireId, lastFilter.weekStart, lastFilter.weekEnd);
      }
    } catch (error) {
      set({ error: String(error) });
    }
  },

  toggleRetard: async (eleveId, date, demiJournee, anneeScolaireId) => {
    try {
      await invoke('toggle_retard', {
        eleveId,
        date,
        demiJournee,
        anneeScolaireId,
      });
      if (lastFilter) {
        await get().loadAbsences(lastFilter.anneeScolaireId, lastFilter.weekStart, lastFilter.weekEnd);
      }
    } catch (error) {
      set({ error: String(error) });
    }
  },

  computeAlerts: async (anneeScolaireId, today) => {
    try {
      const rawAlerts = await invoke<Array<{ eleve_id: number; count: number }>>('compute_absence_alerts', {
        anneeScolaireId,
        today,
      });
      set({ alerts: rawAlerts.map((a) => ({ eleveId: a.eleve_id, count: a.count })) });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  computeTotaux: async (anneeScolaireId, dateDebut, dateFin) => {
    try {
      const raw = await invoke<Array<{ eleve_id: number; justifiees: number; injustifiees: number }>>('compute_absence_totaux', {
        anneeScolaireId,
        dateDebut,
        dateFin,
      });
      return raw.map((t) => ({ eleveId: t.eleve_id, justifiees: t.justifiees, injustifiees: t.injustifiees }));
    } catch (error) {
      set({ error: String(error) });
      return [];
    }
  },
}));
