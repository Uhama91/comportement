import { useState } from 'react';
import type { StudentWithSanctions, Sanction } from '../../types';
import { useStudentStore } from '../../stores/studentStore';
import { SanctionReasonModal } from '../SanctionReasonModal';
import { WeeklyRewardLine } from './WeeklyRewardLine';
import { useWindowSize } from '../../hooks/useWindowSize';

interface StudentGridCardProps {
  student: StudentWithSanctions;
  compact?: boolean;
}

export function StudentGridCard({ student, compact = true }: StudentGridCardProps) {
  const { addWarning, removeWarning, addSanction, deleteStudent, updateStudent, removeSanction, updateSanctionReason } = useStudentStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(student.firstName);
  const [showMenu, setShowMenu] = useState(false);
  const { width } = useWindowSize();

  // Taille adaptative selon la largeur de fenêtre
  const isVerySmall = width < 500;
  const isSmall = width < 700;

  // Modal state
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [editingSanction, setEditingSanction] = useState<Sanction | null>(null);

  const handleDelete = () => {
    if (confirm(`Supprimer ${student.firstName} ?`)) {
      deleteStudent(student.id);
    }
    setShowMenu(false);
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

  // Couleur de fond selon le statut
  const getBgColor = () => {
    if (student.weekSanctionCount > 0) return 'bg-red-50 border-red-200';
    if (student.warnings > 0) return 'bg-amber-50 border-amber-200';
    return 'bg-white border-slate-200';
  };

  return (
    <>
      <div
        className={`
          relative flex flex-col rounded-lg border shadow-sm
          hover:shadow-md transition-shadow
          ${getBgColor()}
          ${isVerySmall ? 'p-1.5 text-[10px]' : isSmall ? 'p-1.5 text-xs' : 'p-2 text-xs'}
          ${compact ? '' : 'text-sm'}
        `}
      >
        {/* Header: Prénom + Avertissements */}
        <div className="flex items-center justify-between mb-1">
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="flex-1 px-1 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
              maxLength={30}
            />
          ) : (
            <div
              className="flex-1 font-semibold text-slate-800 truncate cursor-pointer hover:text-blue-600"
              onClick={() => setIsEditing(true)}
              title={student.firstName}
            >
              {student.firstName}
            </div>
          )}

          {/* Avertissements à côté du prénom - cliquables pour retirer */}
          {student.warnings > 0 && (
            <button
              onClick={() => removeWarning(student.id)}
              className="flex items-center ml-1 flex-shrink-0 hover:scale-110 transition-transform cursor-pointer"
              title="Cliquer pour retirer un avertissement"
            >
              <span className={compact ? 'text-sm' : 'text-base'}>⚠️</span>
              {student.warnings >= 2 && (
                <span className="text-[10px] font-bold text-amber-600 -ml-0.5">2</span>
              )}
            </button>
          )}

          {/* Menu contextuel */}
          <div className="relative ml-1">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="px-1 text-slate-400 hover:text-slate-600"
            >
              ⋮
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border rounded shadow-lg z-10 py-1 min-w-[80px]">
                <button
                  onClick={() => { setIsEditing(true); setShowMenu(false); }}
                  className="w-full px-2 py-1 text-left text-xs hover:bg-slate-100"
                >
                  Modifier
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-2 py-1 text-left text-xs text-red-600 hover:bg-red-50"
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Ligne hebdomadaire L-M-J-V (placeholder pour l'instant) */}
        <div className="mb-1">
          <WeeklyRewardLine studentId={student.id} compact={compact} />
        </div>

        {/* Sanctions de la semaine */}
        {student.weekSanctionCount > 0 && (
          <div className="flex flex-wrap items-center gap-0.5 mb-1">
            {student.sanctions.map((sanction, i) => (
              <button
                key={sanction.id}
                onClick={() => handleEditSanction(sanction)}
                className={`${compact ? 'text-sm' : 'text-base'} cursor-pointer hover:scale-110 transition-transform ${
                  sanction.reason ? 'opacity-100' : 'opacity-60'
                }`}
                title={sanction.reason || `Sanction ${i + 1}`}
              >
                🙁
              </button>
            ))}
            {student.weekSanctionCount >= 10 && (
              <span className="px-1 py-0.5 bg-red-600 text-white text-[8px] font-bold rounded">
                MAX
              </span>
            )}
            <button
              onClick={() => removeSanction(student.id)}
              className="px-1 py-0.5 text-[8px] bg-slate-100 text-slate-600 rounded hover:bg-red-100 hover:text-red-600"
              title="Retirer une sanction"
            >
              -1
            </button>
          </div>
        )}

        {/* Boutons d'action - taille adaptative */}
        <div className="flex gap-1 mt-auto">
          <button
            onClick={() => addWarning(student.id)}
            disabled={student.warnings >= 2 && student.weekSanctionCount >= 10}
            className={`
              flex-1 rounded font-medium transition-colors
              bg-amber-100 text-amber-700 hover:bg-amber-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isVerySmall ? 'py-0.5 text-[9px]' : isSmall ? 'py-1 text-[10px]' : 'py-1.5 text-xs'}
            `}
            title="Avertissement"
          >
            ⚠️
          </button>
          <button
            onClick={handleNewSanction}
            disabled={student.weekSanctionCount >= 10}
            className={`
              flex-1 rounded font-medium transition-colors
              bg-red-100 text-red-700 hover:bg-red-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isVerySmall ? 'py-0.5 text-[9px]' : isSmall ? 'py-1 text-[10px]' : 'py-1.5 text-xs'}
            `}
            title="Sanction"
          >
            🙁
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

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  );
}
