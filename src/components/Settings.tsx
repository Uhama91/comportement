import { useState, useEffect } from 'react';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAutostart();
  }, []);

  const checkAutostart = async () => {
    try {
      const enabled = await isEnabled();
      setAutostartEnabled(enabled);
    } catch (error) {
      console.error('Error checking autostart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAutostart = async () => {
    try {
      if (autostartEnabled) {
        await disable();
        setAutostartEnabled(false);
      } else {
        await enable();
        setAutostartEnabled(true);
      }
    } catch (error) {
      console.error('Error toggling autostart:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">Paramètres</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Autostart */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <div className="font-medium text-slate-800">Démarrage automatique</div>
              <div className="text-sm text-slate-500">
                Lancer l'application au démarrage de l'ordinateur
              </div>
            </div>
            {isLoading ? (
              <div className="text-slate-400">...</div>
            ) : (
              <button
                onClick={toggleAutostart}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  autostartEnabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    autostartEnabled ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            )}
          </div>

          {/* Keyboard shortcuts info */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="font-medium text-slate-800 mb-2">Raccourcis clavier</div>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Afficher l'application</span>
                <kbd className="px-2 py-0.5 bg-slate-200 rounded text-xs font-mono">
                  Ctrl+Shift+C
                </kbd>
              </div>
              <div className="flex justify-between">
                <span>Mode TBI</span>
                <kbd className="px-2 py-0.5 bg-slate-200 rounded text-xs font-mono">
                  F11
                </kbd>
              </div>
              <div className="flex justify-between">
                <span>Quitter le mode TBI</span>
                <kbd className="px-2 py-0.5 bg-slate-200 rounded text-xs font-mono">
                  Échap
                </kbd>
              </div>
            </div>
          </div>

          {/* System tray info */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>Barre système :</strong> Cliquez sur l'icône dans la barre système pour afficher l'application.
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
