import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { AppreciationGenerale, AppreciationGeneraleVersion } from '../types';

interface AppreciationGeneraleStore {
  appreciation: AppreciationGenerale | null;
  versions: AppreciationGeneraleVersion[];
  isGenerating: boolean;
  error: string | null;

  loadCurrent(eleveId: number, periodeId: number, anneeScolaireId: number): Promise<void>;
  save(eleveId: number, periodeId: number, anneeScolaireId: number, texte: string, generatedBy: string): Promise<AppreciationGenerale>;
  generateAndSave(eleveId: number, periodeId: number, anneeScolaireId: number, studentName: string): Promise<AppreciationGenerale>;
  loadVersions(eleveId: number, periodeId: number, anneeScolaireId: number): Promise<void>;
  restoreVersion(eleveId: number, periodeId: number, anneeScolaireId: number, versionId: number): Promise<void>;
  clearState(): void;
}

interface RawAppreciationGenerale {
  id: number;
  eleve_id: number;
  periode_id: number;
  annee_scolaire_id: number;
  version: number;
  texte: string;
  generated_by: string;
  created_at: string;
}

interface RawAppreciationVersion {
  id: number;
  version: number;
  texte: string;
  generated_by: string;
  created_at: string;
}

function mapRaw(r: RawAppreciationGenerale): AppreciationGenerale {
  return {
    id: r.id,
    eleveId: r.eleve_id,
    periodeId: r.periode_id,
    anneeScolaireId: r.annee_scolaire_id,
    version: r.version,
    texte: r.texte,
    generatedBy: r.generated_by as 'llm' | 'manual',
    createdAt: r.created_at,
  };
}

function mapRawVersion(r: RawAppreciationVersion): AppreciationGeneraleVersion {
  return {
    id: r.id,
    version: r.version,
    texte: r.texte,
    generatedBy: r.generated_by as 'llm' | 'manual',
    createdAt: r.created_at,
  };
}

export const useAppreciationGeneraleStore = create<AppreciationGeneraleStore>((set, get) => ({
  appreciation: null,
  versions: [],
  isGenerating: false,
  error: null,

  loadCurrent: async (eleveId, periodeId, anneeScolaireId) => {
    set({ error: null });
    try {
      const raw = await invoke<RawAppreciationGenerale | null>('load_appreciation_current', {
        eleveId,
        periodeId,
        anneeScolaireId,
      });
      set({ appreciation: raw ? mapRaw(raw) : null });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  save: async (eleveId, periodeId, anneeScolaireId, texte, generatedBy) => {
    try {
      const raw = await invoke<RawAppreciationGenerale>('save_appreciation', {
        eleveId,
        periodeId,
        anneeScolaireId,
        texte,
        generatedBy,
      });
      const appreciation = mapRaw(raw);
      set({ appreciation });
      return appreciation;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  generateAndSave: async (eleveId, periodeId, anneeScolaireId, studentName) => {
    set({ isGenerating: true, error: null });
    try {
      const result = await invoke<{ appreciation: string; duration_ms: number }>('generate_appreciation', {
        eleveId,
        periodeId,
        anneeScolaireId,
        studentName,
      });
      const appreciation = await get().save(
        eleveId,
        periodeId,
        anneeScolaireId,
        result.appreciation,
        'llm'
      );
      set({ isGenerating: false });
      return appreciation;
    } catch (error) {
      set({ isGenerating: false, error: String(error) });
      throw error;
    }
  },

  loadVersions: async (eleveId, periodeId, anneeScolaireId) => {
    set({ error: null });
    try {
      const rows = await invoke<RawAppreciationVersion[]>('load_appreciation_versions', {
        eleveId,
        periodeId,
        anneeScolaireId,
      });
      set({ versions: rows.map(mapRawVersion) });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  restoreVersion: async (eleveId, periodeId, anneeScolaireId, versionId) => {
    try {
      const raw = await invoke<RawAppreciationGenerale>('restore_appreciation_version', {
        eleveId,
        periodeId,
        anneeScolaireId,
        versionId,
      });
      set({ appreciation: mapRaw(raw) });
      // Refresh versions list
      await get().loadVersions(eleveId, periodeId, anneeScolaireId);
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  clearState: () => {
    set({ appreciation: null, versions: [], isGenerating: false, error: null });
  },
}));
