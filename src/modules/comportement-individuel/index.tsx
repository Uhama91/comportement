import { useState, useEffect } from 'react';
import { useStudentStore } from '../../shared/stores/studentStore';
import { StudentSummaryPanel } from './components/StudentSummaryPanel';
import { IncidentTabs } from './components/IncidentTabs';
import { useWindowSize } from '../../shared/hooks/useWindowSize';

interface ComportementIndividuelModuleProps {
  selectedStudentId?: number | null;
}

export default function ComportementIndividuelModule({ selectedStudentId }: ComportementIndividuelModuleProps) {
  const { students, isLoading } = useStudentStore();
  const [currentStudentId, setCurrentStudentId] = useState<number | null>(null);
  const { width } = useWindowSize();
  const isNarrow = width < 1024;

  // Sync with external selectedStudentId prop
  useEffect(() => {
    if (selectedStudentId != null) {
      setCurrentStudentId(selectedStudentId);
    }
  }, [selectedStudentId]);

  // Auto-select first student if none selected
  useEffect(() => {
    if (currentStudentId === null && students.length > 0) {
      setCurrentStudentId(students[0].id);
    }
  }, [students, currentStudentId]);

  const currentStudent = students.find(s => s.id === currentStudentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        Chargement...
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <p className="text-sm">Aucun eleve. Ajoutez des eleves dans le Module Classe.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Student selector */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-200 bg-slate-50">
        <label className="text-sm text-slate-500">Eleve :</label>
        <select
          value={currentStudentId ?? ''}
          onChange={(e) => setCurrentStudentId(Number(e.target.value))}
          className="text-sm px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:border-blue-500 outline-none flex-1 max-w-xs"
        >
          {students.map(s => (
            <option key={s.id} value={s.id}>{s.firstName}</option>
          ))}
        </select>
        {/* Quick nav buttons */}
        <div className="flex gap-1">
          <button
            onClick={() => {
              const idx = students.findIndex(s => s.id === currentStudentId);
              if (idx > 0) setCurrentStudentId(students[idx - 1].id);
            }}
            disabled={students.findIndex(s => s.id === currentStudentId) <= 0}
            className="px-2 py-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-30"
            title="Eleve precedent"
          >
            ←
          </button>
          <button
            onClick={() => {
              const idx = students.findIndex(s => s.id === currentStudentId);
              if (idx < students.length - 1) setCurrentStudentId(students[idx + 1].id);
            }}
            disabled={students.findIndex(s => s.id === currentStudentId) >= students.length - 1}
            className="px-2 py-1 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-30"
            title="Eleve suivant"
          >
            →
          </button>
        </div>
      </div>

      {/* Main layout */}
      {currentStudent ? (
        <div className={`flex-1 overflow-hidden ${isNarrow ? 'flex flex-col' : 'flex'}`}>
          {/* Left panel - summary */}
          <div className={`
            border-slate-200 bg-white overflow-y-auto
            ${isNarrow ? 'border-b flex-shrink-0' : 'w-[320px] border-r flex-shrink-0'}
          `}>
            <StudentSummaryPanel student={currentStudent} />
          </div>

          {/* Right panel - tabs */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <IncidentTabs student={currentStudent} />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          Selectionnez un eleve
        </div>
      )}
    </div>
  );
}
