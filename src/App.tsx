import { useState, useEffect } from 'react';
import { StudentGrid } from './components/StudentGrid';
import { TBIView } from './components/TBIView';
import { Settings } from './components/Settings';
import { useStudentStore } from './stores/studentStore';
import { shouldTriggerRewards, markRewardTriggerDone } from './utils/date';

function App() {
  const [isTBIMode, setIsTBIMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { loadStudents, triggerDailyRewards } = useStudentStore();

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

  // Reload students when exiting TBI mode to sync any changes
  const handleExitTBI = () => {
    setIsTBIMode(false);
    loadStudents();
  };

  // Keyboard shortcut: F11 or Escape to toggle TBI mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        setIsTBIMode(prev => !prev);
      }
      if (e.key === 'Escape' && isTBIMode) {
        handleExitTBI();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTBIMode]);

  if (isTBIMode) {
    return <TBIView onExit={handleExitTBI} />;
  }

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
          <button
            onClick={() => setIsTBIMode(true)}
            className="px-2 py-1 text-xs bg-slate-800 text-white rounded hover:bg-slate-900 transition-colors flex items-center gap-1"
            title="Mode TBI plein écran (F11)"
          >
            📺 TBI
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
