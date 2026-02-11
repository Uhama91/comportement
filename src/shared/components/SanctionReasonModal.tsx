import { useState, useEffect } from 'react';
import type { Sanction } from '../types';

interface SanctionReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  existingSanction?: Sanction | null;
  studentName: string;
  defaultReason?: string; // Pour pré-sélectionner un motif (ex: "3 avertissements")
}

const PREDEFINED_REASONS = [
  'Bavardage',
  'Insolence',
  'Violence',
  'Non-respect des règles',
  '3 avertissements',
  'Autre',
] as const;

export function SanctionReasonModal({
  isOpen,
  onClose,
  onConfirm,
  existingSanction,
  studentName,
  defaultReason,
}: SanctionReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (existingSanction?.reason) {
        // Mode édition : déterminer si c'est un motif prédéfini ou custom
        const isPredefined = PREDEFINED_REASONS.includes(existingSanction.reason as any);
        if (isPredefined) {
          setSelectedReason(existingSanction.reason);
          setCustomReason('');
        } else {
          setSelectedReason('Autre');
          setCustomReason(existingSanction.reason);
        }
      } else if (defaultReason) {
        // Pré-sélectionner le motif par défaut (ex: "3 avertissements")
        setSelectedReason(defaultReason);
        setCustomReason('');
      } else {
        // Reset
        setSelectedReason('');
        setCustomReason('');
      }
    }
  }, [isOpen, existingSanction, defaultReason]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = selectedReason === 'Autre' ? customReason : selectedReason;
    if (!finalReason) return; // Ne devrait jamais arriver grâce à la validation
    onConfirm(finalReason);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const isEditing = !!existingSanction;

  // Validation : bouton activé seulement si un motif est sélectionné
  // et si "Autre" est sélectionné, le champ custom doit être rempli
  const isValid = selectedReason && (selectedReason !== 'Autre' || customReason.trim().length > 0);

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
          <div className="space-y-2 mb-4">
            {PREDEFINED_REASONS.map((reasonOption) => (
              <label
                key={reasonOption}
                className="flex items-center gap-3 px-3 py-2 border border-slate-200 rounded-lg
                  hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <input
                  type="radio"
                  name="reason"
                  value={reasonOption}
                  checked={selectedReason === reasonOption}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-4 h-4 text-red-600 focus:ring-red-500"
                />
                <span className="text-slate-700">{reasonOption}</span>
              </label>
            ))}
          </div>

          {/* Champ personnalisé si "Autre" est sélectionné */}
          {selectedReason === 'Autre' && (
            <div className="mb-4">
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Précisez le motif..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
                  resize-none"
                rows={3}
                maxLength={200}
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-1 text-right">
                {customReason.length}/200
              </p>
            </div>
          )}

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
              disabled={!isValid}
              className={`flex-1 px-4 py-2 font-medium rounded-lg transition-colors
                ${isValid
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
            >
              {isEditing ? 'Enregistrer' : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
