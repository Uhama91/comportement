import { create } from 'zustand';
import Database from '@tauri-apps/plugin-sql';
import type { NiveauAcquisition } from '../types';

export interface Domaine {
  id: number;
  nom: string;
  ordreAffichage: number;
  actif: boolean;
}

export interface Appreciation {
  id: number;
  eleveId: number;
  periodeId: number;
  domaineId: number;
  domaineName?: string;
  dateEvaluation: string | null;
  niveau: NiveauAcquisition | null;
  observations: string | null;
  texteDictation: string | null;
  createdAt: string;
}

interface AppreciationStore {
  domaines: Domaine[];
  appreciations: Appreciation[];
  isLoading: boolean;
  error: string | null;

  loadDomaines: () => Promise<void>;
  loadAppreciations: (eleveId: number, periodeId: number) => Promise<void>;

  addAppreciation: (data: {
    eleveId: number;
    periodeId: number;
    domaineId: number;
    niveau?: NiveauAcquisition | null;
    observations?: string;
    texteDictation?: string;
  }) => Promise<boolean>;

  updateAppreciation: (id: number, data: {
    niveau?: NiveauAcquisition | null;
    observations?: string;
  }) => Promise<void>;

  // Batch save from LLM pipeline
  batchSaveAppreciations: (items: Array<{
    eleveId: number;
    periodeId: number;
    domaineId: number;
    niveau: NiveauAcquisition | null;
    observations: string;
    texteDictation?: string;
  }>) => Promise<boolean>;

  // Domain management
  addDomaine: (nom: string) => Promise<void>;
  updateDomaine: (id: number, nom: string) => Promise<void>;
  toggleDomaine: (id: number, actif: boolean) => Promise<void>;
  reorderDomaines: (orderedIds: number[]) => Promise<void>;
}

async function getDb() {
  return await Database.load('sqlite:comportement.db');
}

export const useAppreciationStore = create<AppreciationStore>((set, get) => ({
  domaines: [],
  appreciations: [],
  isLoading: false,
  error: null,

  loadDomaines: async () => {
    try {
      const db = await getDb();
      const rows = await db.select<any[]>(
        `SELECT id, nom, ordre_affichage as ordreAffichage, actif
         FROM domaines_apprentissage
         ORDER BY ordre_affichage ASC`
      );
      set({ domaines: rows.map(r => ({ ...r, actif: Boolean(r.actif) })) });
    } catch (error) {
      console.error('Error loading domaines:', error);
      set({ error: String(error) });
    }
  },

  loadAppreciations: async (eleveId, periodeId) => {
    set({ isLoading: true, error: null });
    try {
      const db = await getDb();
      const rows = await db.select<any[]>(
        `SELECT
          a.id,
          a.eleve_id as eleveId,
          a.periode_id as periodeId,
          a.domaine_id as domaineId,
          d.nom as domaineName,
          a.date_evaluation as dateEvaluation,
          a.niveau,
          a.observations,
          a.texte_dictation as texteDictation,
          a.created_at as createdAt
        FROM appreciations a
        JOIN domaines_apprentissage d ON d.id = a.domaine_id
        WHERE a.eleve_id = $1 AND a.periode_id = $2
        ORDER BY d.ordre_affichage ASC`,
        [eleveId, periodeId]
      );
      set({ appreciations: rows, isLoading: false });
    } catch (error) {
      console.error('Error loading appreciations:', error);
      set({ error: String(error), isLoading: false });
    }
  },

  addAppreciation: async (data) => {
    try {
      const db = await getDb();
      await db.execute(
        `INSERT INTO appreciations (eleve_id, periode_id, domaine_id, date_evaluation, niveau, observations, texte_dictation)
         VALUES ($1, $2, $3, date('now'), $4, $5, $6)`,
        [
          data.eleveId,
          data.periodeId,
          data.domaineId,
          data.niveau || null,
          data.observations || null,
          data.texteDictation || null,
        ]
      );
      await get().loadAppreciations(data.eleveId, data.periodeId);
      return true;
    } catch (error) {
      console.error('Error adding appreciation:', error);
      set({ error: String(error) });
      return false;
    }
  },

  updateAppreciation: async (id, data) => {
    try {
      const db = await getDb();
      const appreciation = get().appreciations.find(a => a.id === id);
      if (!appreciation) return;

      await db.execute(
        `UPDATE appreciations SET niveau = $1, observations = $2 WHERE id = $3`,
        [data.niveau ?? null, data.observations ?? null, id]
      );
      await get().loadAppreciations(appreciation.eleveId, appreciation.periodeId);
    } catch (error) {
      console.error('Error updating appreciation:', error);
      set({ error: String(error) });
    }
  },

  batchSaveAppreciations: async (items) => {
    try {
      const db = await getDb();
      for (const item of items) {
        await db.execute(
          `INSERT INTO appreciations (eleve_id, periode_id, domaine_id, date_evaluation, niveau, observations, texte_dictation)
           VALUES ($1, $2, $3, date('now'), $4, $5, $6)`,
          [item.eleveId, item.periodeId, item.domaineId, item.niveau || null, item.observations, item.texteDictation || null]
        );
      }
      if (items.length > 0) {
        await get().loadAppreciations(items[0].eleveId, items[0].periodeId);
      }
      return true;
    } catch (error) {
      console.error('Error batch saving appreciations:', error);
      set({ error: String(error) });
      return false;
    }
  },

  addDomaine: async (nom) => {
    try {
      const db = await getDb();
      const { domaines } = get();
      const maxOrdre = domaines.reduce((max, d) => Math.max(max, d.ordreAffichage), 0);
      await db.execute(
        'INSERT INTO domaines_apprentissage (nom, ordre_affichage, actif) VALUES ($1, $2, 1)',
        [nom, maxOrdre + 1]
      );
      await get().loadDomaines();
    } catch (error) {
      console.error('Error adding domaine:', error);
      set({ error: String(error) });
    }
  },

  updateDomaine: async (id, nom) => {
    try {
      const db = await getDb();
      await db.execute('UPDATE domaines_apprentissage SET nom = $1 WHERE id = $2', [nom, id]);
      await get().loadDomaines();
    } catch (error) {
      console.error('Error updating domaine:', error);
      set({ error: String(error) });
    }
  },

  toggleDomaine: async (id, actif) => {
    try {
      const db = await getDb();
      await db.execute(
        'UPDATE domaines_apprentissage SET actif = $1 WHERE id = $2',
        [actif ? 1 : 0, id]
      );
      await get().loadDomaines();
    } catch (error) {
      console.error('Error toggling domaine:', error);
      set({ error: String(error) });
    }
  },

  reorderDomaines: async (orderedIds) => {
    try {
      const db = await getDb();
      for (let i = 0; i < orderedIds.length; i++) {
        await db.execute(
          'UPDATE domaines_apprentissage SET ordre_affichage = $1 WHERE id = $2',
          [i + 1, orderedIds[i]]
        );
      }
      await get().loadDomaines();
    } catch (error) {
      console.error('Error reordering domaines:', error);
      set({ error: String(error) });
    }
  },
}));
