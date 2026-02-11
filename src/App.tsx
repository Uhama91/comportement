import { useState, useEffect } from 'react';
import ComportementClasseModule from './modules/comportement-classe';
import ComportementIndividuelModule from './modules/comportement-individuel';
import ApprentissageModule from './modules/apprentissage';
import { Sidebar } from './shared/components/Sidebar';
import { Settings } from './shared/components/Settings';
import { ExportButton } from './shared/components/ExportButton';
import { useStudentStore } from './shared/stores/studentStore';
import { shouldTriggerRewards, markRewardTriggerDone } from './shared/utils/date';

type ModuleId = 'classe' | 'individuel' | 'apprentissage';

function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('classe');
  const [showSettings, setShowSettings] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { triggerDailyRewards } = useStudentStore();

  // Check for automatic daily rewards at 16:30
  useEffect(() => {
    const checkRewards = async () => {
      if (shouldTriggerRewards()) {
        await triggerDailyRewards();
        markRewardTriggerDone();
        console.log('Récompenses quotidiennes attribuées automatiquement (16h30)');
      }
    };

    // Check immediately on mount
    checkRewards();

    // Check every minute
    const interval = setInterval(checkRewards, 60000);
    return () => clearInterval(interval);
  }, [triggerDailyRewards]);

  // Render le module actif
  const renderActiveModule = () => {
    switch (activeModule) {
      case 'classe':
        return <ComportementClasseModule />;
      case 'individuel':
        return <ComportementIndividuelModule />;
      case 'apprentissage':
        return <ApprentissageModule />;
      default:
        return <ComportementClasseModule />;
    }
  };

  return (
    <div className="h-screen flex bg-slate-100">
      {/* Sidebar navigation */}
      <Sidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        onOpenSettings={() => setShowSettings(true)}
        onOpenExport={() => setShowExportModal(true)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-4 py-2 flex-shrink-0">
          <h1 className="text-lg font-bold text-slate-800">
            Comportement
            {activeModule === 'individuel' && ' — Suivi Individuel'}
            {activeModule === 'apprentissage' && ' — Domaines d\'Apprentissage'}
          </h1>
        </header>

        <main className="flex-1 bg-white m-2 rounded-lg shadow overflow-hidden">
          {renderActiveModule()}
        </main>
      </div>

      {/* Modals */}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-bold mb-4">Exporter les données</h2>
            <div className="flex justify-between items-center gap-4">
              <ExportButton />
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
