import { VoiceDictation } from '../../shared/components/VoiceDictation';

export default function ApprentissageModule() {
  const handleTranscriptionComplete = (text: string) => {
    console.log('Transcription terminee:', text);
  };

  const handleStructure = (text: string) => {
    // Story 15.x: envoi au LLM pour structuration
    console.log('Structurer:', text);
  };

  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="flex flex-col items-center gap-6 w-full max-w-lg">
        <div className="text-center text-slate-500">
          <p className="text-lg font-medium mb-1">Module 3 — Domaines d'Apprentissage</p>
          <p className="text-sm">Dictee vocale</p>
        </div>

        <VoiceDictation
          mode="full"
          onTranscriptionComplete={handleTranscriptionComplete}
          onStructure={handleStructure}
        />
      </div>
    </div>
  );
}
