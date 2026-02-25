import React, { useEffect } from 'react';
import { useAppreciationGeneraleStore } from '../../../shared/stores/appreciationGeneraleStore';
import type { AppreciationGeneraleVersion } from '../../../shared/types';

interface AppreciationVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  eleveId: number;
  periodeId: number;
  anneeScolaireId: number;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function AppreciationVersionModal({
  isOpen,
  onClose,
  eleveId,
  periodeId,
  anneeScolaireId,
}: AppreciationVersionModalProps) {
  const { versions, loadVersions, restoreVersion } = useAppreciationGeneraleStore();

  useEffect(() => {
    if (isOpen) {
      loadVersions(eleveId, periodeId, anneeScolaireId);
    }
  }, [isOpen, eleveId, periodeId, anneeScolaireId]);

  if (!isOpen) return null;

  const handleRestore = async (version: AppreciationGeneraleVersion) => {
    const confirmed = window.confirm(
      `Restaurer la version ${version.version} ?\n\nCela créera une nouvelle version avec ce texte.`
    );
    if (!confirmed) return;

    try {
      await restoreVersion(eleveId, periodeId, anneeScolaireId, version.id);
      onClose();
    } catch {
      // error handled in store
    }
  };

  const currentVersion = versions[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-800 text-sm">Historique des versions</h2>
            <p className="text-xs text-slate-500 mt-0.5">Appréciation générale</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4">
          {versions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Aucune version disponible</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {versions.map((version) => {
                const isCurrent = version.id === currentVersion?.id;
                return (
                  <li
                    key={version.id}
                    className={`border rounded-lg p-3 ${
                      isCurrent
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-800">
                          Version {version.version}
                        </span>
                        {isCurrent && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-200 text-blue-700">
                            Actuelle
                          </span>
                        )}
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          version.generatedBy === 'llm'
                            ? 'bg-purple-100 text-purple-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {version.generatedBy === 'llm' ? 'IA' : 'Manuel'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">{formatDate(version.createdAt)}</span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-3 mb-2">
                      {version.texte.slice(0, 100)}{version.texte.length > 100 ? '…' : ''}
                    </p>

                    {!isCurrent && (
                      <button
                        onClick={() => handleRestore(version)}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Restaurer cette version
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-200 rounded hover:bg-slate-50 text-slate-700"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
