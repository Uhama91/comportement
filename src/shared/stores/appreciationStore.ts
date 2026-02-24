import { create } from 'zustand';
import Database from '@tauri-apps/plugin-sql';
import type { NiveauAcquisition, NiveauLsu } from '../types';
import { DOMAINES_OFFICIELS, getDomaineNamesForCycle, type CycleNumber } from '../types/domaines-officiels';

export interface Domaine {
  id: number;
  nom: string;
  ordreAffichage: number;
  actif: boolean;
  cycle: number | null;
  codeLsu: string | null;
  isCustom: boolean;
}

export interface Appreciation {
  id: number;
  eleveId: number;
  periodeId: number;
  domaineId: number;
  domaineName?: string;
  dateEvaluation: string | null;
  niveau: NiveauAcquisition | null;
  niveauLsu: NiveauLsu | null;
  observations: string | null;
  previousObservations: string | null;
  texteDictation: string | null;
  createdAt: string;
}

interface AppreciationStore {
  domaines: Domaine[];
  appreciations: Appreciation[];
  isLoading: boolean;
  error: string | null;

  loadDomaines: (cycle?: CycleNumber | null) => Promise<void>;
  seedDomainesOfficiels: () => Promise<void>;
  loadAppreciations: (eleveId: number, periodeId: number) => Promise<void>;

  addAppreciation: (data: {
    eleveId: number;
    periodeId: number;
    domaineId: number;
    niveauLsu?: NiveauLsu | null;
    observations?: string;
    texteDictation?: string;
  }) => Promise<boolean>;

  updateAppreciation: (id: number, data: {
    niveauLsu?: NiveauLsu | null;
    observations?: string;
  }) => Promise<void>;

  undoAppreciation: (id: number) => Promise<void>;

  // Batch save from LLM pipeline
  batchSaveAppreciations: (items: Array<{
    eleveId: number;
    periodeId: number;
    domaineId: number;
    niveauLsu: NiveauLsu | null;
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

  loadDomaines: async (cycle) => {
    try {
      const db = await getDb();

      let rows: any[];
      if (cycle) {
        // Filtrer par cycle : domaines du referentiel pour ce cycle + domaines custom
        const officialNames = getDomaineNamesForCycle(cycle);
        if (officialNames.length === 0) {
          rows = await db.select<any[]>(
            `SELECT id, nom, ordre_affichage as ordreAffichage, actif,
                    cycle, code_lsu as codeLsu, is_custom as isCustom
             FROM domaines_apprentissage
             WHERE is_custom = 1 AND actif = 1
             ORDER BY ordre_affichage ASC`
          );
        } else {
          // Construire les placeholders ($1, $2, ...) pour la liste de noms
          const placeholders = officialNames.map((_, i) => `$${i + 1}`).join(', ');
          rows = await db.select<any[]>(
            `SELECT id, nom, ordre_affichage as ordreAffichage, actif,
                    cycle, code_lsu as codeLsu, is_custom as isCustom
             FROM domaines_apprentissage
             WHERE (nom IN (${placeholders}) OR is_custom = 1) AND actif = 1
             ORDER BY ordre_affichage ASC`,
            officialNames
          );
        }
      } else {
        // Pas de cycle : charger tous les domaines actifs (retrocompatibilite V2)
        rows = await db.select<any[]>(
          `SELECT id, nom, ordre_affichage as ordreAffichage, actif,
                  cycle, code_lsu as codeLsu, is_custom as isCustom
           FROM domaines_apprentissage
           WHERE actif = 1
           ORDER BY ordre_affichage ASC`
        );
      }

      set({
        domaines: rows.map(r => ({
          ...r,
          actif: Boolean(r.actif),
          isCustom: Boolean(r.isCustom),
        })),
      });
    } catch (error) {
      console.error('Error loading domaines:', error);
      set({ error: String(error) });
    }
  },

  seedDomainesOfficiels: async () => {
    try {
      const db = await getDb();

      // Verifier si les domaines C1/C2 existent deja
      const c1Count = await db.select<any[]>(
        "SELECT COUNT(*) as cnt FROM domaines_apprentissage WHERE nom = 'Explorer le monde'"
      );
      if (c1Count[0]?.cnt > 0) {
        return; // Deja seede
      }

      // Inserer les domaines officiels de tous les cycles
      // Les domaines avec noms identiques entre C2 et C3 existent deja (inseres V1, cycle=3 par M005)
      // On insere seulement les noms qui n'existent pas encore
      for (const cycle of [1, 2, 3] as CycleNumber[]) {
        for (const d of DOMAINES_OFFICIELS[cycle]) {
          await db.execute(
            `INSERT OR IGNORE INTO domaines_apprentissage (nom, ordre_affichage, actif, cycle, code_lsu, is_custom)
             VALUES ($1, $2, 1, $3, $4, 0)`,
            [d.nom, d.ordreAffichage, cycle, d.codeLsu]
          );
          // Mettre a jour code_lsu pour les domaines existants (V2) qui n'avaient pas de code
          await db.execute(
            `UPDATE domaines_apprentissage SET code_lsu = $1 WHERE nom = $2 AND code_lsu IS NULL`,
            [d.codeLsu, d.nom]
          );
        }
      }
    } catch (error) {
      console.error('Error seeding domaines officiels:', error);
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
          a.niveau_lsu as niveauLsu,
          a.observations,
          a.previous_observations as previousObservations,
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
        `INSERT INTO appreciations (eleve_id, periode_id, domaine_id, date_evaluation, niveau_lsu, observations, texte_dictation)
         VALUES ($1, $2, $3, date('now'), $4, $5, $6)`,
        [
          data.eleveId,
          data.periodeId,
          data.domaineId,
          data.niveauLsu || null,
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

      // Build SET clause dynamically — only update provided fields
      const setClauses: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      if ('niveauLsu' in data) {
        setClauses.push(`niveau_lsu = $${paramIdx++}`);
        params.push(data.niveauLsu ?? null);
      }
      if ('observations' in data) {
        // Sauvegarder l'ancienne valeur atomiquement avant d'écraser
        setClauses.push(`previous_observations = observations`);
        setClauses.push(`observations = $${paramIdx++}`);
        params.push(data.observations ?? null);
      }

      if (setClauses.length === 0) return;

      params.push(id);
      await db.execute(
        `UPDATE appreciations SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
        params
      );
      await get().loadAppreciations(appreciation.eleveId, appreciation.periodeId);
    } catch (error) {
      console.error('Error updating appreciation:', error);
      set({ error: String(error) });
    }
  },

  undoAppreciation: async (id) => {
    try {
      const db = await getDb();
      const appreciation = get().appreciations.find(a => a.id === id);
      if (!appreciation) return;
      await db.execute(
        `UPDATE appreciations SET observations = previous_observations, previous_observations = NULL WHERE id = $1 AND previous_observations IS NOT NULL`,
        [id]
      );
      await get().loadAppreciations(appreciation.eleveId, appreciation.periodeId);
    } catch (error) {
      console.error('Error undoing appreciation:', error);
      set({ error: String(error) });
    }
  },

  batchSaveAppreciations: async (items) => {
    try {
      const db = await getDb();
      for (const item of items) {
        await db.execute(
          `INSERT INTO appreciations (eleve_id, periode_id, domaine_id, date_evaluation, niveau_lsu, observations, texte_dictation)
           VALUES ($1, $2, $3, date('now'), $4, $5, $6)`,
          [item.eleveId, item.periodeId, item.domaineId, item.niveauLsu || null, item.observations, item.texteDictation || null]
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
        'INSERT INTO domaines_apprentissage (nom, ordre_affichage, actif, is_custom) VALUES ($1, $2, 1, 1)',
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
