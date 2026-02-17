import { useState, useEffect } from 'react';
import { useStudentStore } from '../../shared/stores/studentStore';
import { useConfigStore } from '../../shared/stores/configStore';
import { useAppreciationStore } from '../../shared/stores/appreciationStore';
import { useModelStore } from '../../shared/stores/modelStore';
import { AppreciationTable } from './components/AppreciationTable';
import { ManualEntryForm } from './components/ManualEntryForm';
import { StructuredObservations } from './components/StructuredObservations';
import { VoiceDictation } from '../../shared/components/VoiceDictation';
import { useStructuration } from './hooks/useStructuration';

export default function ApprentissageModule() {
  const { students } = useStudentStore();
  const { periodes, activePeriode } = useConfigStore();
  const { loadDomaines, loadAppreciations } = useAppreciationStore();
  const { modelsStatus } = useModelStore();
  const modelsReady = modelsStatus?.all_installed ?? false;

  const [currentStudentId, setCurrentStudentId] = useState<number | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [lastDictatedText, setLastDictatedText] = useState('');

  const structuration = useStructuration();

  // Auto-select first student
  useEffect(() => {
    if (currentStudentId === null && students.length > 0) {
      setCurrentStudentId(students[0].id);
    }
  }, [students, currentStudentId]);

  // Load domaines once
  useEffect(() => {
    loadDomaines();
  }, [loadDomaines]);

  const currentPeriodeId = activePeriode?.id;
  const currentStudent = students.find(s => s.id === currentStudentId);

  const handleReload = () => {
    if (currentStudentId && currentPeriodeId) {
      loadAppreciations(currentStudentId, currentPeriodeId);
    }
  };

  const handleStructure = async (text: string) => {
    if (!currentStudent) return;
    setLastDictatedText(text);
    await structuration.structureText(text, currentStudent.firstName);
  };

  const handleSaveStructured = async () => {
    if (!currentStudentId || !currentPeriodeId) return;
    const success = await structuration.validateAndSave(currentStudentId, currentPeriodeId, lastDictatedText);
    if (success) {
      handleReload();
      structuration.reset();
    }
  };

  // No periods configured
  if (periodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="text-center">
          <p className="text-sm mb-2">Veuillez configurer les periodes scolaires</p>
          <p className="text-xs">Parametres → Periodes scolaires</p>
        </div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <p className="text-sm">Aucun eleve. Ajoutez des eleves dans le Module Classe.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-200 bg-slate-50 flex-wrap">
        <label className="text-sm text-slate-500">Eleve :</label>
        <select
          value={currentStudentId ?? ''}
          onChange={e => setCurrentStudentId(Number(e.target.value))}
          className="text-sm px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 focus:border-blue-500 outline-none max-w-[200px]"
        >
          {students.map(s => (
            <option key={s.id} value={s.id}>{s.firstName}</option>
          ))}
        </select>

        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => modelsReady && setShowVoice(!showVoice)}
            disabled={!modelsReady}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              !modelsReady
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                : showVoice
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title={!modelsReady ? 'Modeles IA non installes' : ''}
          >
            🎤 Dictee vocale
          </button>
          <button
            onClick={() => setShowManualForm(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            + Saisie manuelle
          </button>
        </div>
      </div>

      {/* Models not installed warning */}
      {!modelsReady && (
        <div className="px-4 py-2 border-b border-amber-200 bg-amber-50">
          <div className="text-xs text-amber-700">
            Modeles IA non installes — la dictee vocale et la structuration ne sont pas disponibles.
            <span className="ml-1 font-medium">Parametres → Modeles IA</span> pour installer.
          </div>
        </div>
      )}

      {/* Voice dictation panel */}
      {showVoice && modelsReady && (
        <div className="px-4 py-3 border-b border-slate-200 bg-blue-50">
          <VoiceDictation
            mode="full"
            onTranscriptionComplete={(text) => setLastDictatedText(text)}
            onStructure={handleStructure}
          />
        </div>
      )}

      {/* Structuration result (LLM pipeline) */}
      {structuration.state === 'structuring' && (
        <div className="px-4 py-6 border-b border-slate-200 text-center">
          <div className="text-sm text-slate-500">Structuration en cours...</div>
          <div className="text-xs text-slate-400 mt-1">Le LLM analyse le texte dicte</div>
        </div>
      )}

      {(structuration.state === 'reviewing' || structuration.state === 'saving') && (
        <div className="px-4 py-3 border-b border-slate-200 bg-green-50">
          <StructuredObservations
            observations={structuration.observations}
            durationMs={structuration.durationMs}
            onUpdateObservation={structuration.updateObservation}
            onAddObservation={structuration.addObservation}
            onRemoveObservation={structuration.removeObservation}
            onSave={handleSaveStructured}
            onCancel={structuration.reset}
            saving={structuration.state === 'saving'}
          />
        </div>
      )}

      {structuration.state === 'error' && (
        <div className="px-4 py-3 border-b border-slate-200 bg-red-50">
          <div className="text-sm text-red-600 mb-2">{structuration.error}</div>
          <div className="flex gap-2">
            <button
              onClick={() => handleStructure(lastDictatedText)}
              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Reessayer
            </button>
            <button
              onClick={() => { structuration.reset(); setShowManualForm(true); }}
              className="px-3 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
            >
              Saisir manuellement
            </button>
          </div>
        </div>
      )}

      {structuration.state === 'done' && (
        <div className="px-4 py-2 border-b border-slate-200 bg-green-50">
          <div className="text-sm text-green-600 font-medium">Appreciations enregistrees</div>
        </div>
      )}

      {/* Appreciation table */}
      <div className="flex-1 overflow-y-auto p-4">
        {currentStudentId && currentPeriodeId ? (
          <AppreciationTable
            eleveId={currentStudentId}
            periodeId={currentPeriodeId}
          />
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">
            Selectionnez un eleve et une periode
          </div>
        )}
      </div>

      {/* Manual entry modal */}
      {showManualForm && (
        <ManualEntryForm
          defaultEleveId={currentStudentId ?? undefined}
          defaultPeriodeId={currentPeriodeId}
          onClose={() => setShowManualForm(false)}
          onSaved={handleReload}
        />
      )}
    </div>
  );
}
