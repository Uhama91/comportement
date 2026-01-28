import { useState } from 'react';
import { useStudentStore } from '../stores/studentStore';
import { getCurrentWeek } from '../utils/date';
import { SanctionReasonModal } from './SanctionReasonModal';
import { WeeklyRewardLine } from './StudentGrid/WeeklyRewardLine';
import type { Sanction, StudentWithSanctions } from '../types';

interface TBIViewProps {
  onExit: () => void;
}

export function TBIView({ onExit }: TBIViewProps) {
  const { students, addWarning, removeWarning, addSanction, updateSanctionReason, removeSanction } = useStudentStore();
  const { week, year } = getCurrentWeek();

  // Modal state
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [editingSanction, setEditingSanction] = useState<Sanction | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithSanctions | null>(null);

  // Tri alphabétique FIXE (ne change jamais)
  const sortedStudents = [...students].sort((a, b) =>
    a.firstName.localeCompare(b.firstName, 'fr')
  );

  // Calcul du nombre de colonnes optimal
  const getGridCols = (count: number): string => {
    if (count <= 12) return 'grid-cols-3 sm:grid-cols-4';
    if (count <= 16) return 'grid-cols-4';
    if (count <= 20) return 'grid-cols-4 sm:grid-cols-5';
    if (count <= 24) return 'grid-cols-5 sm:grid-cols-6';
    return 'grid-cols-5 sm:grid-cols-6 md:grid-cols-7';
  };

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

  // Couleur de fond selon le statut
  const getBgColor = (student: StudentWithSanctions) => {
    if (student.weekSanctionCount > 0) return 'bg-red-900 border-red-500';
    if (student.warnings > 0) return 'bg-amber-900 border-amber-500';
    return 'bg-slate-800 border-slate-600';
  };

  return (
    <div className="fixed inset-0 bg-slate-900 text-white flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 px-4 py-2 flex items-center justify-between shadow-lg flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold">Comportement</h1>
          <p className="text-xs text-slate-400">Semaine {week} ({year})</p>
        </div>
        <button
          onClick={onExit}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold transition-colors"
        >
          ✕ Quitter
        </button>
      </div>

      {/* Students grid - prend tout l'espace restant */}
      <div className="flex-1 p-3 pb-14 min-h-0 overflow-hidden">
        {students.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xl text-slate-500">Aucun élève</p>
          </div>
        ) : (
          <div
            className={`
              grid gap-2 h-full
              ${getGridCols(students.length)}
              auto-rows-fr
            `}
          >
            {sortedStudents.map((student) => (
              <div
                key={student.id}
                className={`
                  flex flex-col p-2 rounded-xl border-2 transition-all
                  ${getBgColor(student)}
                `}
              >
                {/* Header: Prénom + Avertissements (cliquables pour retirer) */}
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="font-bold text-base truncate">
                    {student.firstName}
                  </span>
                  {student.warnings > 0 && (
                    <button
                      onClick={() => removeWarning(student.id)}
                      className="flex items-center hover:scale-110 transition-transform"
                      title="Cliquer pour retirer un avertissement"
                    >
                      <span className="text-lg">⚠️</span>
                      {student.warnings >= 2 && (
                        <span className="text-xs font-bold text-amber-400">2</span>
                      )}
                    </button>
                  )}
                </div>

                {/* Ligne hebdomadaire L-M-J-V */}
                <div className="flex justify-center mb-1">
                  <WeeklyRewardLine studentId={student.id} compact={false} />
                </div>

                {/* Sanctions */}
                {student.weekSanctionCount > 0 && (
                  <div className="flex flex-wrap justify-center gap-0.5 mb-1">
                    {student.sanctions.map((sanction, i) => (
                      <button
                        key={sanction.id}
                        onClick={() => handleEditSanction(student, sanction)}
                        className={`text-base cursor-pointer hover:scale-110 transition-transform ${
                          sanction.reason ? 'opacity-100' : 'opacity-60'
                        }`}
                        title={sanction.reason || `Sanction ${i + 1}`}
                      >
                        🙁
                      </button>
                    ))}
                    {student.weekSanctionCount >= 10 && (
                      <span className="px-1 bg-red-600 text-white text-[8px] font-bold rounded">MAX</span>
                    )}
                    <button
                      onClick={() => removeSanction(student.id)}
                      className="px-1 text-[8px] bg-slate-700 rounded hover:bg-red-700"
                    >
                      -1
                    </button>
                  </div>
                )}

                {/* Indicateur OK si rien */}
                {student.warnings === 0 && student.weekSanctionCount === 0 && (
                  <div className="text-center text-lg mb-1">😊</div>
                )}

                {/* Boutons d'action */}
                <div className="flex gap-1 mt-auto">
                  <button
                    onClick={() => addWarning(student.id)}
                    disabled={student.warnings >= 2 && student.weekSanctionCount >= 10}
                    className="flex-1 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-bold transition-colors"
                  >
                    ⚠️
                  </button>
                  <button
                    onClick={() => handleNewSanction(student)}
                    disabled={student.weekSanctionCount >= 10}
                    className="flex-1 py-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-bold transition-colors"
                  >
                    🙁
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer legend */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 px-4 py-1.5 flex justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span>😊</span>
          <span className="text-slate-400">OK</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="px-1 bg-amber-600 rounded">⚠️</span>
          <span className="text-slate-400">Avert.</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="px-1 bg-red-600 rounded">🙁</span>
          <span className="text-slate-400">Sanction</span>
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
