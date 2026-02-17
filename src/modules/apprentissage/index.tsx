import { useState, useEffect } from 'react';
import { useStudentStore } from '../../shared/stores/studentStore';
import { useConfigStore } from '../../shared/stores/configStore';
import { useAppreciationStore } from '../../shared/stores/appreciationStore';
import { AppreciationTable } from './components/AppreciationTable';
import { ManualEntryForm } from './components/ManualEntryForm';

export default function ApprentissageModule() {
  const { students } = useStudentStore();
  const { periodes, activePeriode } = useConfigStore();
  const { loadDomaines, loadAppreciations } = useAppreciationStore();

  const [currentStudentId, setCurrentStudentId] = useState<number | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);

  // Auto-select first student
  useEffect(() => {
    if (currentStudentId === null && students.length > 0) {
      setCurrentStudentId(students[0].id);
    }
  }, [students, currentStudentId]);

  // Load domaines once
  useEffect(() => {
    loadDomaines();
  }, [loadDomaines]);

  const currentPeriodeId = activePeriode?.id;

  const handleReload = () => {
    if (currentStudentId && currentPeriodeId) {
      loadAppreciations(currentStudentId, currentPeriodeId);
    }
  };

  // No periods configured
  if (periodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="text-center">
          <p className="text-sm mb-2">Veuillez configurer les periodes scolaires</p>
          <p className="text-xs">Parametres → Periodes scolaires</p>
        </div>
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
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-200 bg-slate-50 flex-wrap">
        <label className="text-sm text-slate-500">Eleve :</label>
        <select
          value={currentStudentId ?? ''}
          onChange={e => setCurrentStudentId(Number(e.target.value))}
          className="text-sm px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:border-blue-500 outline-none max-w-[200px]"
        >
          {students.map(s => (
            <option key={s.id} value={s.id}>{s.firstName}</option>
          ))}
        </select>

        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setShowManualForm(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            + Saisie manuelle
          </button>
        </div>
      </div>

      {/* Appreciation table */}
      <div className="flex-1 overflow-y-auto p-4">
        {currentStudentId && currentPeriodeId ? (
          <AppreciationTable
            eleveId={currentStudentId}
            periodeId={currentPeriodeId}
          />
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">
            Selectionnez un eleve et une periode
          </div>
        )}
      </div>

      {/* Manual entry modal */}
      {showManualForm && (
        <ManualEntryForm
          defaultEleveId={currentStudentId ?? undefined}
          defaultPeriodeId={currentPeriodeId}
          onClose={() => setShowManualForm(false)}
          onSaved={handleReload}
        />
      )}
    </div>
  );
}
