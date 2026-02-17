import { useState } from 'react';
import { useModelStore } from '../stores/modelStore';
import { DownloadProgress } from './DownloadProgress';
import { UsbInstall } from './UsbInstall';

type InstallMethod = 'choose' | 'internet' | 'usb';

export function ModelSetupWizard() {
  const { modelsStatus, setupStep, setSetupStep, setShowSetupWizard } = useModelStore();
  const [installMethod, setInstallMethod] = useState<InstallMethod>('choose');

  const handleSkip = () => {
    localStorage.setItem('modelSetupSkipped', 'true');
    setShowSetupWizard(false);
  };

  if (setupStep === 'checking') {
    return (
      <div className="fixed inset-0 bg-slate-100 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="text-lg text-slate-500">Verification des modeles IA...</div>
        </div>
      </div>
    );
  }

  if (setupStep === 'done') {
    return (
      <div className="fixed inset-0 bg-slate-100 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4 text-center">
          <div className="text-4xl mb-4">&#10003;</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Modeles installes</h2>
          <p className="text-sm text-slate-500 mb-6">
            Les modeles IA sont prets. La dictee vocale et la structuration automatique sont disponibles.
          </p>
          <button
            onClick={() => setShowSetupWizard(false)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Commencer
          </button>
        </div>
      </div>
    );
  }

  // Downloading state
  if (setupStep === 'downloading') {
    return (
      <div className="fixed inset-0 bg-slate-100 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4">
          {installMethod === 'internet' && <DownloadProgress />}
          {installMethod === 'usb' && <UsbInstall />}
        </div>
      </div>
    );
  }

  // Main setup screen (setupStep === 'choose')
  return (
    <div className="fixed inset-0 bg-slate-100 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Configuration initiale</h1>
          <p className="text-sm text-slate-500">
            Pour utiliser la dictee vocale et la structuration automatique,
            les modeles IA doivent etre installes (~1.5 Go).
          </p>
        </div>

        {/* Model status */}
        {modelsStatus && (
          <div className="space-y-2 mb-6">
            <ModelStatusRow
              name={modelsStatus.whisper.name}
              sizeMb={modelsStatus.whisper.expected_size_mb}
              installed={modelsStatus.whisper.installed}
            />
            <ModelStatusRow
              name={modelsStatus.llama.name}
              sizeMb={modelsStatus.llama.expected_size_mb}
              installed={modelsStatus.llama.installed}
            />
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => { setInstallMethod('internet'); setSetupStep('downloading'); }}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            Telecharger depuis Internet
          </button>
          <button
            onClick={() => { setInstallMethod('usb'); setSetupStep('downloading'); }}
            className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm"
          >
            Installer depuis un dossier (cle USB)
          </button>
          <button
            onClick={handleSkip}
            className="w-full px-4 py-2 text-slate-400 hover:text-slate-600 text-xs transition-colors"
          >
            Passer cette etape (Modules 1 et 2 accessibles sans IA)
          </button>
        </div>
      </div>
    </div>
  );
}

function ModelStatusRow({ name, sizeMb, installed }: { name: string; sizeMb: number; installed: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
      <div>
        <div className="text-sm font-medium text-slate-700">{name}</div>
        <div className="text-xs text-slate-400">{sizeMb} Mo</div>
      </div>
      {installed ? (
        <span className="text-xs text-green-600 font-medium px-2 py-1 bg-green-50 rounded">Installe</span>
      ) : (
        <span className="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded">Absent</span>
      )}
    </div>
  );
}
