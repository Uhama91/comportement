import { useState } from 'react';
import type { StudentWithSanctions, Sanction } from '../types';
import { useStudentStore } from '../stores/studentStore';
import { SanctionReasonModal } from './SanctionReasonModal';

interface StudentCardProps {
  student: StudentWithSanctions;
}

export function StudentCard({ student }: StudentCardProps) {
  const { addWarning, addSanction, deleteStudent, updateStudent, removeSanction, updateSanctionReason } = useStudentStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(student.firstName);

  // Modal state
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [editingSanction, setEditingSanction] = useState<Sanction | null>(null);

  const handleDelete = () => {
    if (confirm(`Supprimer ${student.firstName} ?`)) {
      deleteStudent(student.id);
    }
  };

  const handleSave = async () => {
    if (editName.trim()) {
      await updateStudent(student.id, editName);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditName(student.firstName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  // Open modal for new sanction
  const handleNewSanction = () => {
    setEditingSanction(null);
    setShowReasonModal(true);
  };

  // Open modal to edit existing sanction
  const handleEditSanction = (sanction: Sanction) => {
    setEditingSanction(sanction);
    setShowReasonModal(true);
  };

  // Confirm sanction (new or edit)
  const handleConfirmReason = async (reason: string) => {
    if (editingSanction) {
      await updateSanctionReason(editingSanction.id, reason);
    } else {
      await addSanction(student.id, reason || undefined);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-4">
          {/* Nom */}
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                maxLength={30}
              />
              <button
                onClick={handleSave}
                className="px-2 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                title="Sauvegarder"
              >
                ✓
              </button>
              <button
                onClick={handleCancel}
                className="px-2 py-1 text-sm bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                title="Annuler"
              >
                ✕
              </button>
            </div>
          ) : (
            <span
              className="text-lg font-medium text-slate-800 min-w-[120px] cursor-pointer hover:text-blue-600"
              onClick={() => setIsEditing(true)}
              title="Cliquer pour modifier"
            >
              {student.firstName}
            </span>
          )}

          {/* Avertissements */}
          <div className="flex items-center gap-1">
            {student.warnings >= 1 && (
              <span className="text-2xl" title="1er avertissement">⚠️</span>
            )}
            {student.warnings >= 2 && (
              <span className="text-sm font-bold text-amber-600">×2</span>
            )}
          </div>

          {/* Sanctions de la semaine - cliquables */}
          {student.weekSanctionCount > 0 && (
            <div className="flex items-center gap-1 ml-2">
              {student.sanctions.map((sanction, i) => (
                <button
                  key={sanction.id}
                  onClick={() => handleEditSanction(sanction)}
                  className={`text-xl cursor-pointer hover:scale-125 transition-transform ${
                    sanction.reason ? 'opacity-100' : 'opacity-70'
                  }`}
                  title={sanction.reason || `Sanction ${i + 1} - Cliquer pour ajouter une raison`}
                >
                  🙁
                </button>
              ))}
              {student.weekSanctionCount >= 10 && (
                <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
                  MAX
                </span>
              )}
              <button
                onClick={() => removeSanction(student.id)}
                className="ml-1 px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded hover:bg-red-100 hover:text-red-600 transition-colors"
                title="Retirer une sanction"
              >
                -1
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Bouton modifier */}
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 text-sm text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Modifier le prénom"
            >
              ✏️
            </button>
          )}

          {/* Bouton avertissement */}
          <button
            onClick={() => addWarning(student.id)}
            disabled={student.warnings >= 2 && student.weekSanctionCount >= 10}
            className="px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded
              hover:bg-amber-200 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
            title="Donner un avertissement"
          >
            ⚠️ Avertir
          </button>

          {/* Bouton sanction directe */}
          <button
            onClick={handleNewSanction}
            disabled={student.weekSanctionCount >= 10}
            className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded
              hover:bg-red-200 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
            title="Donner une sanction directe"
          >
            🙁 Sanction
          </button>

          {/* Bouton supprimer */}
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Supprimer l'élève"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Modal raison sanction */}
      <SanctionReasonModal
        isOpen={showReasonModal}
        onClose={() => setShowReasonModal(false)}
        onConfirm={handleConfirmReason}
        existingSanction={editingSanction}
        studentName={student.firstName}
      />
    </>
  );
}
