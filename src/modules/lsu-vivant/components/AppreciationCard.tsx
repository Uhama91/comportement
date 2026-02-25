import React, { useState, useEffect } from 'react';
import { useAppreciationGeneraleStore } from '../../../shared/stores/appreciationGeneraleStore';
import AppreciationVersionModal from './AppreciationVersionModal';

interface AppreciationCardProps {
  eleveId: number;
  periodeId: number;
  anneeScolaireId: number;
  studentName: string;
}

const MAX_CHARS = 1500;

export default function AppreciationCard({
  eleveId,
  periodeId,
  anneeScolaireId,
  studentName,
}: AppreciationCardProps) {
  const { appreciation, isGenerating, generateAndSave, save, loadCurrent } =
    useAppreciationGeneraleStore();

  const [texte, setTexte] = useState(appreciation?.texte ?? '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load current on mount / when student/période changes
  useEffect(() => {
    loadCurrent(eleveId, periodeId, anneeScolaireId);
  }, [eleveId, periodeId, anneeScolaireId, loadCurrent]);

  // Sync textarea when appreciation changes externally (e.g., after restore)
  useEffect(() => {
    setTexte(appreciation?.texte ?? '');
  }, [appreciation?.id]);

  const handleGenerate = async () => {
    try {
      const result = await generateAndSave(eleveId, periodeId, anneeScolaireId, studentName);
      setTexte(result.texte);
    } catch {
      // error handled in store
    }
  };

  const handleSave = async () => {
    if (!texte.trim()) return;
    setIsSaving(true);
    try {
      await save(eleveId, periodeId, anneeScolaireId, texte, 'manual');
    } finally {
      setIsSaving(false);
    }
  };

  const generatedByLabel = appreciation?.generatedBy === 'llm' ? 'IA' : 'Manuel';
  const charCount = texte.length;

  return (
    <div className="border border-indigo-200 rounded-lg p-4 flex flex-col gap-3 bg-indigo-50/30">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-800 text-sm">Appréciation générale</h3>
        {appreciation && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">
            {generatedByLabel} · v{appreciation.version}
          </span>
        )}
      </div>

      <textarea
        className="w-full border border-slate-200 rounded p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 text-slate-700 placeholder-slate-400 bg-white"
        rows={6}
        maxLength={MAX_CHARS}
        placeholder="Pas encore d'appréciation générale. Cliquez sur Générer pour créer via IA, ou saisissez manuellement."
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        disabled={isGenerating}
      />

      <div className="flex items-center justify-between">
        <span className={`text-xs ${charCount > MAX_CHARS * 0.9 ? 'text-amber-600' : 'text-slate-400'}`}>
          {charCount}/{MAX_CHARS}
        </span>

        <div className="flex gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded hover:bg-slate-50 text-slate-600 transition-colors"
          >
            Versions
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || !texte.trim()}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 text-slate-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isGenerating ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Génération...
              </>
            ) : (
              'Générer'
            )}
          </button>
        </div>
      </div>

      <AppreciationVersionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eleveId={eleveId}
        periodeId={periodeId}
        anneeScolaireId={anneeScolaireId}
      />
    </div>
  );
}
