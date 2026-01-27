import { useState } from 'react';
import { useStudentStore } from '../stores/studentStore';
import { getCurrentWeek } from '../utils/date';
import { SanctionReasonModal } from './SanctionReasonModal';
import type { Sanction, StudentWithSanctions } from '../types';

interface TBIViewProps {
  onExit: () => void;
}

export function TBIView({ onExit }: TBIViewProps) {
  const { students, addWarning, addSanction, updateSanctionReason } = useStudentStore();
  const { week, year } = getCurrentWeek();

  // Modal state
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [editingSanction, setEditingSanction] = useState<Sanction | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithSanctions | null>(null);

  // Students with sanctions first, then alphabetical
  const sortedStudents = [...students].sort((a, b) => {
    if (a.weekSanctionCount !== b.weekSanctionCount) {
      return b.weekSanctionCount - a.weekSanctionCount;
    }
    return a.firstName.localeCompare(b.firstName);
  });

  // Open modal for new sanction
  const handleNewSanction = (student: StudentWithSanctions) => {
    setSelectedStudent(student);
    setEditingSanction(null);
    setShowReasonModal(true);
  };

  // Open modal to edit existing sanction
  const handleEditSanction = (student: StudentWithSanctions, sanction: Sanction) => {
    setSelectedStudent(student);
    setEditingSanction(sanction);
    setShowReasonModal(true);
  };

  // Confirm sanction (new or edit)
  const handleConfirmReason = async (reason: string) => {
    if (editingSanction) {
      await updateSanctionReason(editingSanction.id, reason);
    } else if (selectedStudent) {
      await addSanction(selectedStudent.id, reason || undefined);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 text-white overflow-auto z-50">
      {/* Header */}
      <div className="sticky top-0 bg-slate-800 px-8 py-4 flex items-center justify-between shadow-lg">
        <div>
          <h1 className="text-4xl font-bold">Comportement</h1>
          <p className="text-xl text-slate-400">Semaine {week} ({year})</p>
        </div>
        <button
          onClick={onExit}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-xl text-2xl font-bold transition-colors"
        >
          ✕ Quitter
        </button>
      </div>

      {/* Students grid */}
      <div className="p-8 pb-28">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {sortedStudents.map((student) => (
            <div
              key={student.id}
              className={`
                p-4 rounded-2xl transition-all
                ${student.weekSanctionCount > 0
                  ? 'bg-red-900 border-4 border-red-500'
                  : 'bg-slate-800 border-4 border-slate-600'
                }
              `}
            >
              {/* Name */}
              <div className="text-2xl font-bold mb-3 text-center truncate">
                {student.firstName}
              </div>

              {/* Warnings */}
              <div className="flex justify-center gap-2 mb-3 min-h-[40px]">
                {student.warnings >= 1 && (
                  <span className="text-4xl">⚠️</span>
                )}
                {student.warnings >= 2 && (
                  <span className="text-4xl">⚠️</span>
                )}
              </div>

              {/* Sanctions - cliquables pour modifier la raison */}
              {student.weekSanctionCount > 0 && (
                <div className="flex flex-wrap justify-center gap-1 mb-3">
                  {student.sanctions.map((sanction, i) => (
                    <button
                      key={sanction.id}
                      onClick={() => handleEditSanction(student, sanction)}
                      className={`text-3xl cursor-pointer hover:scale-125 transition-transform ${
                        sanction.reason ? 'opacity-100' : 'opacity-70'
                      }`}
                      title={sanction.reason || `Sanction ${i + 1} - Cliquer pour ajouter une raison`}
                    >
                      🙁
                    </button>
                  ))}
                  {student.weekSanctionCount >= 10 && (
                    <span className="ml-2 px-3 py-1 bg-red-600 text-white text-lg font-bold rounded-lg">
                      MAX
                    </span>
                  )}
                </div>
              )}

              {/* Clean slate indicator */}
              {student.warnings === 0 && student.weekSanctionCount === 0 && (
                <div className="text-center text-4xl mb-3">😊</div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => addWarning(student.id)}
                  disabled={student.warnings >= 2 && student.weekSanctionCount >= 10}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xl font-bold transition-colors"
                  title="Avertissement"
                >
                  ⚠️
                </button>
                <button
                  onClick={() => handleNewSanction(student)}
                  disabled={student.weekSanctionCount >= 10}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xl font-bold transition-colors"
                  title="Sanction directe"
                >
                  🙁
                </button>
              </div>
            </div>
          ))}
        </div>

        {students.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl text-slate-500">Aucun élève</p>
          </div>
        )}
      </div>

      {/* Footer legend */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 px-8 py-4 flex justify-center gap-8 text-lg">
        <div className="flex items-center gap-2">
          <span className="text-2xl">😊</span>
          <span className="text-slate-400">Aucun problème</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-amber-600 rounded-lg text-xl">⚠️</span>
          <span className="text-slate-400">Avertissement</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-red-600 rounded-lg text-xl">🙁</span>
          <span className="text-slate-400">Sanction directe</span>
        </div>
      </div>

      {/* Modal raison sanction */}
      <SanctionReasonModal
        isOpen={showReasonModal}
        onClose={() => setShowReasonModal(false)}
        onConfirm={handleConfirmReason}
        existingSanction={editingSanction}
        studentName={selectedStudent?.firstName || ''}
      />
    </div>
  );
}
