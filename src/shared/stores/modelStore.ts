import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { ModelsCheckResult, DownloadProgress } from '../types';

type SetupStep = 'checking' | 'choose' | 'downloading' | 'done';

interface ModelStoreState {
  // Model status
  modelsStatus: ModelsCheckResult | null;
  loading: boolean;

  // Setup wizard
  setupStep: SetupStep;
  showSetupWizard: boolean;

  // Download progress
  downloadProgress: DownloadProgress | null;
  downloadError: string | null;

  // Actions
  checkModels: () => Promise<void>;
  setSetupStep: (step: SetupStep) => void;
  setShowSetupWizard: (show: boolean) => void;
  setDownloadProgress: (progress: DownloadProgress | null) => void;
  setDownloadError: (error: string | null) => void;
}

export const useModelStore = create<ModelStoreState>((set) => ({
  modelsStatus: null,
  loading: true,
  setupStep: 'checking',
  showSetupWizard: false,
  downloadProgress: null,
  downloadError: null,

  checkModels: async () => {
    try {
      set({ loading: true });
      const result = await invoke<ModelsCheckResult>('check_models_status');
      set({ modelsStatus: result, loading: false });

      // Show wizard if models not installed and user hasn't skipped
      if (!result.all_installed) {
        const skipped = localStorage.getItem('modelSetupSkipped');
        if (!skipped) {
          set({ showSetupWizard: true, setupStep: 'choose' });
        }
      }
    } catch (error) {
      console.error('Error checking models:', error);
      set({ loading: false });
    }
  },

  setSetupStep: (step) => set({ setupStep: step }),
  setShowSetupWizard: (show) => set({ showSetupWizard: show }),
  setDownloadProgress: (progress) => set({ downloadProgress: progress }),
  setDownloadError: (error) => set({ downloadError: error }),
}));
