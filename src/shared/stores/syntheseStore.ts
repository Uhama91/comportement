import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { Synthese, SyntheseVersion } from '../types';

interface SyntheseStore {
  syntheses: Record<number, Synthese>;   // domaineId -> derniere synthese
  versions: SyntheseVersion[];
  isGenerating: boolean;
  error: string | null;

  loadForStudent(eleveId: number, periodeId: number, anneeScolaireId: number, domaineIds: number[]): Promise<void>;
  saveSynthese(eleveId: number, domaineId: number, periodeId: number, anneeScolaireId: number, texte: string, generatedBy: string): Promise<Synthese>;
  generateAndSave(eleveId: number, domaineId: number, periodeId: number, anneeScolaireId: number, studentName: string): Promise<Synthese>;
  loadVersions(eleveId: number, domaineId: number, periodeId: number, anneeScolaireId: number): Promise<void>;
  restoreVersion(eleveId: number, domaineId: number, periodeId: number, anneeScolaireId: number, versionId: number): Promise<void>;
  clearState(): void;
}

interface RawSynthese {
  id: number;
  eleve_id: number;
  domaine_id: number;
  periode_id: number;
  annee_scolaire_id: number;
  version: number;
  texte: string;
  generated_by: string;
  created_at: string;
}

interface RawSyntheseVersion {
  id: number;
  version: number;
  texte: string;
  generated_by: string;
  created_at: string;
}

function mapRawSynthese(r: RawSynthese): Synthese {
  return {
    id: r.id,
    eleveId: r.eleve_id,
    domaineId: r.domaine_id,
    periodeId: r.periode_id,
    anneeScolaireId: r.annee_scolaire_id,
    version: r.version,
    texte: r.texte,
    generatedBy: r.generated_by as 'llm' | 'manual',
    createdAt: r.created_at,
  };
}

function mapRawVersion(r: RawSyntheseVersion): SyntheseVersion {
  return {
    id: r.id,
    version: r.version,
    texte: r.texte,
    generatedBy: r.generated_by as 'llm' | 'manual',
    createdAt: r.created_at,
  };
}

export const useSyntheseStore = create<SyntheseStore>((set, get) => ({
  syntheses: {},
  versions: [],
  isGenerating: false,
  error: null,

  loadForStudent: async (eleveId, periodeId, anneeScolaireId, domaineIds) => {
    set({ error: null });
    try {
      const results = await Promise.all(
        domaineIds.map((domaineId) =>
          invoke<RawSynthese | null>('load_synthese_current', {
            eleveId,
            domaineId,
            periodeId,
            anneeScolaireId,
          })
        )
      );

      const syntheses: Record<number, Synthese> = {};
      results.forEach((raw, idx) => {
        if (raw) {
          syntheses[domaineIds[idx]] = mapRawSynthese(raw);
        }
      });

      set({ syntheses });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  saveSynthese: async (eleveId, domaineId, periodeId, anneeScolaireId, texte, generatedBy) => {
    try {
      const raw = await invoke<RawSynthese>('save_synthese', {
        eleveId,
        domaineId,
        periodeId,
        anneeScolaireId,
        texte,
        generatedBy,
      });
      const synthese = mapRawSynthese(raw);
      set((state) => ({
        syntheses: { ...state.syntheses, [domaineId]: synthese },
      }));
      return synthese;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  generateAndSave: async (eleveId, domaineId, periodeId, anneeScolaireId, studentName) => {
    set({ isGenerating: true, error: null });
    try {
      const result = await invoke<{ synthese: string; duration_ms: number }>('generate_synthese', {
        eleveId,
        domaineId,
        periodeId,
        anneeScolaireId,
        studentName,
      });
      const synthese = await get().saveSynthese(
        eleveId,
        domaineId,
        periodeId,
        anneeScolaireId,
        result.synthese,
        'llm'
      );
      set({ isGenerating: false });
      return synthese;
    } catch (error) {
      set({ isGenerating: false, error: String(error) });
      throw error;
    }
  },

  loadVersions: async (eleveId, domaineId, periodeId, anneeScolaireId) => {
    set({ error: null });
    try {
      const rows = await invoke<RawSyntheseVersion[]>('load_synthese_versions', {
        eleveId,
        domaineId,
        periodeId,
        anneeScolaireId,
      });
      set({ versions: rows.map(mapRawVersion) });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  restoreVersion: async (eleveId, domaineId, periodeId, anneeScolaireId, versionId) => {
    try {
      const raw = await invoke<RawSynthese>('restore_synthese_version', {
        eleveId,
        domaineId,
        periodeId,
        anneeScolaireId,
        versionId,
      });
      const synthese = mapRawSynthese(raw);
      set((state) => ({
        syntheses: { ...state.syntheses, [domaineId]: synthese },
      }));
      // Refresh versions list
      await get().loadVersions(eleveId, domaineId, periodeId, anneeScolaireId);
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  clearState: () => {
    set({ syntheses: {}, versions: [], isGenerating: false, error: null });
  },
}));
