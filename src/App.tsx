import { useState, useEffect } from 'react';
import { StudentList } from './components/StudentList';
import { TBIView } from './components/TBIView';
import { Settings } from './components/Settings';
import { useStudentStore } from './stores/studentStore';

function App() {
  const [isTBIMode, setIsTBIMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { loadStudents } = useStudentStore();

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
    <div className="min-h-screen bg-slate-100 p-2">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Comportement
          </h1>
          <p className="text-xs text-slate-600">
            Suivi du comportement des élèves
          </p>
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
            className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded hover:bg-slate-900 transition-colors flex items-center gap-1"
            title="Mode TBI plein écran (F11)"
          >
            <span className="text-base">📺</span>
            Mode TBI
          </button>
        </div>
      </header>

      <main className="bg-white rounded-lg shadow p-3 max-w-2xl">
        <StudentList />
      </main>

      <footer className="mt-2 text-center text-xs text-slate-400">
        Appuyez sur F11 pour basculer en mode TBI
      </footer>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;
