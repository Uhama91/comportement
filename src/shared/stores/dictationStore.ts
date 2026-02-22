// Story 19.2 — Global dictation state store
// Bridge between ToolbarMic (capture) and future Stories 19.3 (LLM) / 20.1 (review panel)

import { create } from 'zustand';

export type DictationState = 'idle' | 'recording' | 'processing' | 'done' | 'error';

interface DictationStoreState {
  state: DictationState;
  transcribedText: string;
  error: string | null;
  eleveId: number | null;
  periodeId: number | null;

  setState: (state: DictationState) => void;
  setTranscribedText: (text: string) => void;
  setError: (error: string | null) => void;
  setContext: (eleveId: number | null, periodeId: number | null) => void;
  clear: () => void;
}

export const useDictationStore = create<DictationStoreState>((set) => ({
  state: 'idle',
  transcribedText: '',
  error: null,
  eleveId: null,
  periodeId: null,

  setState: (state) => set({ state }),
  setTranscribedText: (text) => set({ transcribedText: text }),
  setError: (error) => set({ error }),
  setContext: (eleveId, periodeId) => set({ eleveId, periodeId }),
  clear: () => set({ state: 'idle', transcribedText: '', error: null }),
}));
