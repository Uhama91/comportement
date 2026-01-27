import { useState, useEffect, useRef } from 'react';
import type { Sanction } from '../types';

interface SanctionReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  existingSanction?: Sanction | null;
  studentName: string;
}

export function SanctionReasonModal({
  isOpen,
  onClose,
  onConfirm,
  existingSanction,
  studentName,
}: SanctionReasonModalProps) {
  const [reason, setReason] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setReason(existingSanction?.reason || '');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, existingSanction]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(reason);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const isEditing = !!existingSanction;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-slate-800 mb-2">
          {isEditing ? 'Modifier la raison' : 'Nouvelle sanction'}
        </h3>
        <p className="text-slate-600 mb-4">
          {isEditing
            ? `Modifier la raison de la sanction pour ${studentName}`
            : `Ajouter une sanction pour ${studentName}`}
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Raison de la sanction (optionnel)..."
            className="w-full px-4 py-3 border border-slate-300 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
              resize-none"
            rows={3}
            maxLength={200}
          />
          <p className="text-xs text-slate-400 mt-1 text-right">
            {reason.length}/200
          </p>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg
                hover:bg-slate-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg
                hover:bg-red-700 transition-colors"
            >
              {isEditing ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
