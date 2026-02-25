import React, { useState, useEffect } from 'react';
import { useSyntheseStore } from '../../../shared/stores/syntheseStore';
import VersionModal from './VersionModal';

interface SynthesisCardProps {
  eleveId: number;
  domaineId: number;
  domaineNom: string;
  periodeId: number;
  anneeScolaireId: number;
  studentName: string;
}

const MAX_CHARS = 1000;

export default function SynthesisCard({
  eleveId,
  domaineId,
  domaineNom,
  periodeId,
  anneeScolaireId,
  studentName,
}: SynthesisCardProps) {
  const { syntheses, isGenerating, generateAndSave, saveSynthese } = useSyntheseStore();
  const synthese = syntheses[domaineId];

  const [texte, setTexte] = useState(synthese?.texte ?? '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync textarea when synthese changes externally (e.g., after restore)
  useEffect(() => {
    setTexte(synthese?.texte ?? '');
  }, [synthese?.id]);

  const handleGenerate = async () => {
    try {
      const result = await generateAndSave(eleveId, domaineId, periodeId, anneeScolaireId, studentName);
      setTexte(result.texte);
    } catch {
      // error handled in store
    }
  };

  const handleSave = async () => {
    if (!texte.trim()) return;
    setIsSaving(true);
    try {
      await saveSynthese(eleveId, domaineId, periodeId, anneeScolaireId, texte, 'manual');
    } finally {
      setIsSaving(false);
    }
  };

  const generatedByLabel = synthese?.generatedBy === 'llm' ? 'IA' : 'Manuel';
  const charCount = texte.length;

  return (
    <div className="border border-slate-200 rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-800 text-sm">{domaineNom}</h3>
        {synthese && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
            {generatedByLabel} · v{synthese.version}
          </span>
        )}
      </div>

      <textarea
        className="w-full border border-slate-200 rounded p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-700 placeholder-slate-400"
        rows={5}
        maxLength={MAX_CHARS}
        placeholder="Pas encore de synthese. Cliquez sur Synthetiser pour generer via IA, ou saisissez manuellement."
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
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isGenerating ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generation...
              </>
            ) : (
              'Synthetiser'
            )}
          </button>
        </div>
      </div>

      <VersionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eleveId={eleveId}
        domaineId={domaineId}
        domaineNom={domaineNom}
        periodeId={periodeId}
        anneeScolaireId={anneeScolaireId}
      />
    </div>
  );
}
