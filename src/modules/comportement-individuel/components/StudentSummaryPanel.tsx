import type { StudentWithSanctions } from '../../../shared/types';
import { useStudentStore } from '../../../shared/stores/studentStore';
import { useState } from 'react';
import { SanctionReasonModal } from '../../../shared/components/SanctionReasonModal';

interface StudentSummaryPanelProps {
  student: StudentWithSanctions;
}

export function StudentSummaryPanel({ student }: StudentSummaryPanelProps) {
  const { addWarning, addSanction, toggleAbsence } = useStudentStore();
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [defaultReason, setDefaultReason] = useState<string | undefined>(undefined);

  const initials = student.firstName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleAddWarning = async () => {
    const result = await addWarning(student.id);
    if (result?.thirdWarning) {
      setDefaultReason('3 avertissements');
      setShowReasonModal(true);
    }
  };

  const handleConfirmReason = async (reason: string) => {
    await addSanction(student.id, reason || undefined);
    setDefaultReason(undefined);
  };

  const activeRewards = student.weeklyRewards.filter(r => !r.cancelled);

  return (
    <div className="flex flex-col h-full">
      {/* Avatar + nom */}
      <div className="flex flex-col items-center py-6 border-b border-slate-200">
        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold mb-3">
          {initials}
        </div>
        <h2 className="text-lg font-bold text-slate-800">{student.firstName}</h2>
      </div>

      {/* Stats */}
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500">Avertissements</span>
          <span className="font-medium text-amber-600">
            {student.warnings > 0 ? `${'⚠️'.repeat(student.warnings)}` : '—'}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500">Sanctions (semaine)</span>
          <span className="font-medium text-red-600">
            {student.weekSanctionCount > 0 ? `${'🙁'.repeat(Math.min(student.weekSanctionCount, 5))}${student.weekSanctionCount > 5 ? ` +${student.weekSanctionCount - 5}` : ''}` : '—'}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500">Recompenses</span>
          <span className="font-medium text-green-600">
            {activeRewards.length > 0 ? activeRewards.length : '—'}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500">Absences (semaine)</span>
          <span className="font-medium text-slate-600">
            {student.absences.length > 0 ? student.absences.length : '—'}
          </span>
        </div>
        {student.todayAbsent && (
          <div className="text-xs text-center py-1 bg-slate-100 rounded text-slate-500 font-medium">
            Absent(e) aujourd'hui
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="p-4 mt-auto border-t border-slate-200 space-y-2">
        <button
          onClick={handleAddWarning}
          disabled={student.todayAbsent}
          className="w-full py-2 px-3 text-sm font-medium rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ⚠️ Avertir
        </button>
        <button
          onClick={() => setShowReasonModal(true)}
          disabled={student.todayAbsent || student.weekSanctionCount >= 10}
          className="w-full py-2 px-3 text-sm font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          🙁 Sanctionner
        </button>
        <button
          onClick={() => toggleAbsence(student.id)}
          className={`w-full py-2 px-3 text-sm font-medium rounded-lg transition-colors ${
            student.todayAbsent
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {student.todayAbsent ? 'Marquer present(e)' : 'Marquer absent(e)'}
        </button>
      </div>

      <SanctionReasonModal
        isOpen={showReasonModal}
        onClose={() => {
          setShowReasonModal(false);
          setDefaultReason(undefined);
        }}
        onConfirm={handleConfirmReason}
        studentName={student.firstName}
        defaultReason={defaultReason}
      />
    </div>
  );
}
