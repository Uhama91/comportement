// Story 19.2 — Global dictation state store
// Bridge between ToolbarMic (capture) and Stories 19.3 (LLM classification) / 20.1 (review panel)

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { ClassificationResults } from '../types';

export type DictationState = 'idle' | 'recording' | 'processing' | 'done' | 'classifying' | 'classified' | 'error';

interface DictationStoreState {
  state: DictationState;
  transcribedText: string;
  error: string | null;
  eleveId: number | null;
  periodeId: number | null;
  classificationResults: ClassificationResults | null;

  setState: (state: DictationState) => void;
  setTranscribedText: (text: string) => void;
  setError: (error: string | null) => void;
  setContext: (eleveId: number | null, periodeId: number | null) => void;
  classifyText: () => Promise<void>;
  clear: () => void;
}

export const useDictationStore = create<DictationStoreState>((set, get) => ({
  state: 'idle',
  transcribedText: '',
  error: null,
  eleveId: null,
  periodeId: null,
  classificationResults: null,

  setState: (state) => set({ state }),
  setTranscribedText: (text) => set({ transcribedText: text }),
  setError: (error) => set({ error }),
  setContext: (eleveId, periodeId) => set({ eleveId, periodeId }),

  classifyText: async () => {
    const { transcribedText, eleveId, periodeId } = get();

    if (!transcribedText || eleveId == null || periodeId == null) {
      set({ state: 'error', error: 'Contexte manquant (texte, eleve ou periode)' });
      return;
    }

    set({ state: 'classifying', error: null });

    try {
      const results = await invoke<ClassificationResults>('classify_and_merge', {
        text: transcribedText,
        eleveId,
        periodeId,
      });
      set({ state: 'classified', classificationResults: results });
    } catch (e) {
      set({ state: 'error', error: String(e) });
    }
  },

  clear: () => set({
    state: 'idle',
    transcribedText: '',
    error: null,
    classificationResults: null,
  }),
}));
