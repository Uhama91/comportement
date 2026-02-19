import { create } from 'zustand';
import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/core';
import type { AnneeScolaire } from '../types';

interface AnneeStore {
  annees: AnneeScolaire[];
  activeAnnee: AnneeScolaire | null;
  isLoading: boolean;
  error: string | null;

  loadAnnees: () => Promise<void>;
  createAnnee: (label: string, dateDebut: string, dateFin: string) => Promise<void>;
  setActive: (id: number) => Promise<void>;
  cloturer: (id: number) => Promise<void>;
  rouvrir: (id: number) => Promise<void>;
  checkAnneeClosed: (anneeId: number) => Promise<void>;
}

async function getDb() {
  return await Database.load('sqlite:comportement.db');
}

export const useAnneeStore = create<AnneeStore>((set, get) => ({
  annees: [],
  activeAnnee: null,
  isLoading: false,
  error: null,

  loadAnnees: async () => {
    set({ isLoading: true, error: null });
    try {
      const db = await getDb();
      const rows = await db.select<any[]>(
        `SELECT
          id,
          label,
          date_debut as dateDebut,
          date_fin as dateFin,
          active,
          cloturee,
          created_at as createdAt
        FROM annees_scolaires
        ORDER BY date_debut DESC`
      );

      const annees: AnneeScolaire[] = rows.map(r => ({
        ...r,
        active: Boolean(r.active),
        cloturee: Boolean(r.cloturee),
      }));
      const activeAnnee = annees.find(a => a.active) || null;

      set({ annees, activeAnnee, isLoading: false });
    } catch (error) {
      console.error('Error loading annees:', error);
      set({ error: String(error), isLoading: false });
    }
  },

  createAnnee: async (label, dateDebut, dateFin) => {
    try {
      const db = await getDb();
      // Desactiver l'ancienne annee active
      await db.execute('UPDATE annees_scolaires SET active = 0 WHERE active = 1');
      // Creer et activer la nouvelle
      await db.execute(
        `INSERT INTO annees_scolaires (label, date_debut, date_fin, active)
         VALUES ($1, $2, $3, 1)`,
        [label, dateDebut, dateFin]
      );
      await get().loadAnnees();
    } catch (error) {
      console.error('Error creating annee:', error);
      set({ error: String(error) });
    }
  },

  setActive: async (id) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE annees_scolaires SET active = 0 WHERE active = 1');
      await db.execute('UPDATE annees_scolaires SET active = 1 WHERE id = $1', [id]);
      await get().loadAnnees();
    } catch (error) {
      console.error('Error setting active annee:', error);
      set({ error: String(error) });
    }
  },

  cloturer: async (id) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE annees_scolaires SET cloturee = 1 WHERE id = $1', [id]);
      await get().loadAnnees();
    } catch (error) {
      console.error('Error closing annee:', error);
      set({ error: String(error) });
    }
  },

  rouvrir: async (id) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE annees_scolaires SET cloturee = 0 WHERE id = $1', [id]);
      // Reactiver l'annee reouverte
      await db.execute('UPDATE annees_scolaires SET active = 0 WHERE active = 1');
      await db.execute('UPDATE annees_scolaires SET active = 1 WHERE id = $1', [id]);
      await get().loadAnnees();
    } catch (error) {
      console.error('Error reopening annee:', error);
      set({ error: String(error) });
    }
  },

  // Guard — appelle la commande Rust check_annee_not_closed
  // Les stories suivantes (18.3, 19, 20, 21) utiliseront cette methode
  // avant toute ecriture scopee par annee.
  checkAnneeClosed: async (anneeId) => {
    await invoke('check_annee_not_closed', { anneeId });
  },
}));
