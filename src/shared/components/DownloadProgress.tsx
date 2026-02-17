import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { DownloadProgress as DownloadProgressType } from '../types';
import { useModelStore } from '../stores/modelStore';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}

export function DownloadProgress() {
  const { setSetupStep, checkModels, setDownloadError } = useModelStore();
  const [progress, setProgress] = useState<DownloadProgressType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setup = async () => {
      unlisten = await listen<DownloadProgressType>('download_progress', (event) => {
        setProgress(event.payload);
        if (event.payload.status === 'complete' && event.payload.current_model === event.payload.total_models) {
          setIsComplete(true);
        }
      });

      // Start download
      try {
        await invoke('download_models');
        // Download finished successfully
        await checkModels();
        setSetupStep('done');
      } catch (err) {
        const msg = String(err);
        setError(msg);
        setDownloadError(msg);
      }
    };

    setup();
    return () => { unlisten?.(); };
  }, [checkModels, setSetupStep, setDownloadError]);

  const handleCancel = async () => {
    try {
      await invoke('cancel_download');
    } catch {
      // ignore
    }
    setSetupStep('choose');
  };

  if (error) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="text-sm font-medium text-red-700 mb-1">Erreur de telechargement</div>
          <div className="text-xs text-red-600">{error}</div>
        </div>
        <button
          onClick={() => setSetupStep('choose')}
          className="px-4 py-2 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
        >
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">
        Telechargement des modeles IA
      </h3>

      {progress && (
        <div className="space-y-3">
          {/* Current model info */}
          <div className="text-xs text-slate-500">
            Modele {progress.current_model}/{progress.total_models} : {progress.model_name}
            {progress.status === 'verifying' && ' — Verification...'}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progress.status === 'verifying' ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(progress.percentage, 100)}%` }}
            />
          </div>

          {/* Size info */}
          <div className="flex justify-between text-xs text-slate-400">
            <span>
              {formatBytes(progress.downloaded_bytes)} / {formatBytes(progress.total_bytes)}
            </span>
            <span>{progress.percentage.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {!progress && (
        <div className="text-xs text-slate-400">Connexion au serveur...</div>
      )}

      {!isComplete && (
        <button
          onClick={handleCancel}
          className="px-4 py-2 text-xs bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
        >
          Annuler
        </button>
      )}
    </div>
  );
}
