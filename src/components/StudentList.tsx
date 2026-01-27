import { useEffect, useState } from 'react';
import { useStudentStore } from '../stores/studentStore';
import { StudentCard } from './StudentCard';
import { AddStudentForm } from './AddStudentForm';
import { WeeklySummary } from './WeeklySummary';
import { ExportButton } from './ExportButton';

export function StudentList() {
  const { students, isLoading, error, loadStudents } = useStudentStore();
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  if (isLoading) {
    return (
      <div className="text-center py-8 text-slate-500">
        Chargement...
      </div>
    );
  }

  return (
    <div>
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSummary(!showSummary)}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              showSummary
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            📊 Résumé
          </button>
        </div>
        <ExportButton />
      </div>

      {/* Weekly Summary */}
      {showSummary && (
        <div className="mb-6">
          <WeeklySummary />
        </div>
      )}

      <AddStudentForm />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {students.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg mb-2">Aucun élève</p>
          <p className="text-sm">Ajoutez votre premier élève ci-dessus</p>
        </div>
      ) : (
        <div className="space-y-2">
          {students.map((student) => (
            <StudentCard key={student.id} student={student} />
          ))}
        </div>
      )}

      <div className="mt-4 text-sm text-slate-400 text-right">
        {students.length} / 30 élèves
      </div>
    </div>
  );
}
