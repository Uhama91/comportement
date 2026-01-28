import { useState, useEffect } from 'react';
import { StudentGrid } from './components/StudentGrid';
import { Settings } from './components/Settings';
import { useStudentStore } from './stores/studentStore';
import { shouldTriggerRewards, markRewardTriggerDone } from './utils/date';

function App() {
  const [showSettings, setShowSettings] = useState(false);
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

  return (
    <div className="h-screen flex flex-col bg-slate-100 p-2 overflow-hidden">
      <header className="mb-2 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-800">
            Comportement
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(true)}
            className="px-2 py-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
            title="Paramètres"
          >
            ⚙️
          </button>
        </div>
      </header>

      <main className="flex-1 bg-white rounded-lg shadow p-3 min-h-0 overflow-hidden">
        <StudentGrid compact />
      </main>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;
