import { create } from 'zustand';
import Database from '@tauri-apps/plugin-sql';
import { useConfigStore } from './configStore';

export interface Incident {
  id: number;
  eleveId: number;
  dateIncident: string;
  heureIncident: string | null;
  periodeId: number | null;
  typeEvenement: string;
  motif: string;
  description: string | null;
  intervenant: string;
  createdAt: string;
}

export const EVENT_TYPES = [
  'Comportement perturbateur',
  'Violence',
  'Insolence',
  'Non-respect du materiel',
  'Refus de travail',
  'Autre',
] as const;

export type EventType = typeof EVENT_TYPES[number];

interface IncidentStore {
  incidents: Incident[];
  isLoading: boolean;
  error: string | null;

  loadIncidents: (eleveId: number) => Promise<void>;
  addIncident: (data: {
    eleveId: number;
    dateIncident: string;
    heureIncident: string;
    typeEvenement: string;
    motif: string;
    description?: string;
    intervenant?: string;
  }) => Promise<boolean>;
  updateIncident: (id: number, data: {
    dateIncident: string;
    heureIncident: string;
    typeEvenement: string;
    motif: string;
    description?: string;
    intervenant?: string;
  }) => Promise<void>;
  deleteIncident: (id: number, eleveId: number) => Promise<void>;
}

async function getDb() {
  return await Database.load('sqlite:comportement.db');
}

export const useIncidentStore = create<IncidentStore>((set, get) => ({
  incidents: [],
  isLoading: false,
  error: null,

  loadIncidents: async (eleveId: number) => {
    set({ isLoading: true, error: null });
    try {
      const db = await getDb();
      const rows = await db.select<any[]>(
        `SELECT
          id,
          eleve_id as eleveId,
          date_incident as dateIncident,
          heure_incident as heureIncident,
          periode_id as periodeId,
          type_evenement as typeEvenement,
          motif,
          description,
          intervenant,
          created_at as createdAt
        FROM comportement_detail
        WHERE eleve_id = $1
        ORDER BY date_incident DESC, heure_incident DESC`,
        [eleveId]
      );
      set({ incidents: rows, isLoading: false });
    } catch (error) {
      console.error('Error loading incidents:', error);
      set({ error: String(error), isLoading: false });
    }
  },

  addIncident: async (data) => {
    try {
      const db = await getDb();
      const activePeriode = useConfigStore.getState().activePeriode;

      await db.execute(
        `INSERT INTO comportement_detail
          (eleve_id, date_incident, heure_incident, periode_id, type_evenement, motif, description, intervenant)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          data.eleveId,
          data.dateIncident,
          data.heureIncident || null,
          activePeriode?.id || null,
          data.typeEvenement,
          data.motif,
          data.description || null,
          data.intervenant || 'Enseignant',
        ]
      );

      await get().loadIncidents(data.eleveId);
      return true;
    } catch (error) {
      console.error('Error adding incident:', error);
      set({ error: String(error) });
      return false;
    }
  },

  updateIncident: async (id, data) => {
    try {
      const db = await getDb();

      await db.execute(
        `UPDATE comportement_detail SET
          date_incident = $1,
          heure_incident = $2,
          type_evenement = $3,
          motif = $4,
          description = $5,
          intervenant = $6
        WHERE id = $7`,
        [
          data.dateIncident,
          data.heureIncident || null,
          data.typeEvenement,
          data.motif,
          data.description || null,
          data.intervenant || 'Enseignant',
          id,
        ]
      );

      // Reload for the current student
      const incidents = get().incidents;
      const incident = incidents.find(i => i.id === id);
      if (incident) {
        await get().loadIncidents(incident.eleveId);
      }
    } catch (error) {
      console.error('Error updating incident:', error);
      set({ error: String(error) });
    }
  },

  deleteIncident: async (id, eleveId) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM comportement_detail WHERE id = $1', [id]);
      await get().loadIncidents(eleveId);
    } catch (error) {
      console.error('Error deleting incident:', error);
      set({ error: String(error) });
    }
  },
}));
