// Module 3 — Evaluations (Epic 24)
// Saisie individuelle, saisie par lot, historique par eleve

import { useState, useEffect } from 'react';
import { EvaluationForm } from './components/EvaluationForm';
import { BatchEvaluation } from './components/BatchEvaluation';
import { EvaluationHistory } from './components/EvaluationHistory';
import { useStudentStore } from '../../shared/stores/studentStore';
import type { StudentWithSanctions } from '../../shared/types';

type Tab = 'individuel' | 'lot' | 'historique';

export default function EvaluationsModule() {
  const { students, loadStudents } = useStudentStore();
  const [tab, setTab] = useState<Tab>('individuel');
  const [selectedStudent, setSelectedStudent] = useState<StudentWithSanctions | null>(null);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const sortedStudents = [...students].sort((a, b) => a.firstName.localeCompare(b.firstName));

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex items-center gap-0 px-4 pt-2 flex-shrink-0">
        {([
          { id: 'individuel' as Tab, label: 'Individuel' },
          { id: 'lot' as Tab, label: 'Par lot' },
          { id: 'historique' as Tab, label: 'Historique' },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition-colors ${
              tab === t.id
                ? 'border-blue-500 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {tab === 'individuel' && (
          <div className="flex h-full">
            {/* Student list */}
            <div className="w-[180px] border-r border-slate-200 overflow-y-auto flex-shrink-0">
              {sortedStudents.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  className={`
                    w-full px-3 py-2 text-xs text-left transition-colors
                    ${selectedStudent?.id === s.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                    }
                  `}
                >
                  {s.firstName}
                  {s.niveau && <span className="ml-1 text-slate-400">({s.niveau})</span>}
                </button>
              ))}
            </div>

            {/* Form */}
            <div className="flex-1 min-w-0">
              {selectedStudent ? (
                <EvaluationForm
                  key={selectedStudent.id}
                  student={selectedStudent}
                  onDone={() => setSelectedStudent(null)}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-slate-400">
                  Selectionner un eleve
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'lot' && <BatchEvaluation />}

        {tab === 'historique' && (
          <div className="flex h-full">
            {/* Student list */}
            <div className="w-[180px] border-r border-slate-200 overflow-y-auto flex-shrink-0">
              {sortedStudents.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  className={`
                    w-full px-3 py-2 text-xs text-left transition-colors
                    ${selectedStudent?.id === s.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                    }
                  `}
                >
                  {s.firstName}
                </button>
              ))}
            </div>

            {/* History */}
            <div className="flex-1 min-w-0 overflow-y-auto">
              {selectedStudent ? (
                <EvaluationHistory student={selectedStudent} />
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-slate-400">
                  Selectionner un eleve
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
