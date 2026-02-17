import { create } from 'zustand';
import Database from '@tauri-apps/plugin-sql';
import type { Periode, TypePeriode } from '../types';
import { getCurrentSchoolYear, getActivePeriode } from '../utils/periodes';

interface ConfigStore {
  periodes: Periode[];
  activePeriode: Periode | null;
  isLoading: boolean;
  error: string | null;

  loadPeriodes: () => Promise<void>;
  savePeriodes: (
    typePeriode: TypePeriode,
    periodes: Array<{ numero: number; dateDebut: string; dateFin: string; nomAffichage: string }>
  ) => Promise<void>;
  setActivePeriode: (periode: Periode | null) => void;
}

async function getDb() {
  return await Database.load('sqlite:comportement.db');
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  periodes: [],
  activePeriode: null,
  isLoading: false,
  error: null,

  loadPeriodes: async () => {
    set({ isLoading: true, error: null });
    try {
      const db = await getDb();
      const anneeScolaire = getCurrentSchoolYear();

      const rows = await db.select<any[]>(
        `SELECT
          id,
          annee_scolaire as anneeScolaire,
          type_periode as typePeriode,
          numero,
          date_debut as dateDebut,
          date_fin as dateFin,
          nom_affichage as nomAffichage,
          created_at as createdAt
        FROM config_periodes
        WHERE annee_scolaire = $1
        ORDER BY numero ASC`,
        [anneeScolaire]
      );

      const periodes: Periode[] = rows;
      const activePeriode = getActivePeriode(periodes);

      set({ periodes, activePeriode, isLoading: false });
    } catch (error) {
      console.error('Error loading periodes:', error);
      set({ error: String(error), isLoading: false });
    }
  },

  savePeriodes: async (typePeriode, periodesData) => {
    try {
      const db = await getDb();
      const anneeScolaire = getCurrentSchoolYear();

      // Delete existing periods for this school year
      await db.execute(
        'DELETE FROM config_periodes WHERE annee_scolaire = $1',
        [anneeScolaire]
      );

      // Insert new periods
      for (const p of periodesData) {
        await db.execute(
          `INSERT INTO config_periodes (annee_scolaire, type_periode, numero, date_debut, date_fin, nom_affichage)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [anneeScolaire, typePeriode, p.numero, p.dateDebut, p.dateFin, p.nomAffichage]
        );
      }

      // Reload
      await get().loadPeriodes();
    } catch (error) {
      console.error('Error saving periodes:', error);
      set({ error: String(error) });
    }
  },

  setActivePeriode: (periode) => {
    set({ activePeriode: periode });
  },
}));
