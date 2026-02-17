import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { useModelStore } from '../stores/modelStore';

interface InstallProgress {
  model_name: string;
  status: string;
  current: number;
  total: number;
}

export function UsbInstall() {
  const { setSetupStep, checkModels } = useModelStore();
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<InstallProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    const setup = async () => {
      unlisten = await listen<InstallProgress>('install_progress', (event) => {
        setProgress(event.payload);
      });
    };
    setup();
    return () => { unlisten?.(); };
  }, []);

  const handlePickFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Selectionnez le dossier contenant les modeles IA',
      });
      if (selected) {
        setFolderPath(selected as string);
        setError(null);
      }
    } catch (err) {
      console.error('Error picking folder:', err);
    }
  };

  const handleInstall = async () => {
    if (!folderPath) return;
    setInstalling(true);
    setError(null);

    try {
      await invoke('install_models_from_folder', { folderPath });
      await checkModels();
      setSetupStep('done');
    } catch (err) {
      setError(String(err));
      setInstalling(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">
        Installation depuis un dossier
      </h3>
      <p className="text-xs text-slate-500">
        Selectionnez le dossier contenant les fichiers modeles
        (ggml-small.bin et qwen2.5-coder-1.5b-instruct-q4_k_m.gguf).
      </p>

      {/* Folder picker */}
      <div className="flex items-center gap-2">
        <button
          onClick={handlePickFolder}
          disabled={installing}
          className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          Choisir le dossier
        </button>
        {folderPath && (
          <span className="text-xs text-slate-500 truncate flex-1">{folderPath}</span>
        )}
      </div>

      {/* Progress */}
      {progress && installing && (
        <div className="text-xs text-slate-500">
          {progress.status === 'copying' && `Copie de ${progress.model_name}...`}
          {progress.status === 'verifying' && `Verification de ${progress.model_name}...`}
          {progress.status === 'complete' && `${progress.model_name} installe (${progress.current}/${progress.total})`}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="text-xs text-red-600">{error}</div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setSetupStep('choose')}
          disabled={installing}
          className="px-4 py-2 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          Retour
        </button>
        {folderPath && (
          <button
            onClick={handleInstall}
            disabled={installing}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
          >
            {installing ? 'Installation...' : 'Installer'}
          </button>
        )}
      </div>
    </div>
  );
}
