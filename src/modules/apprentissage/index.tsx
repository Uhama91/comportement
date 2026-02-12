import { AudioRecorderTest } from '../../shared/components/AudioRecorderTest';

export default function ApprentissageModule() {
  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="space-y-6">
        <div className="text-center text-slate-500">
          <p className="text-lg mb-2">Module 3 — Domaines d'Apprentissage</p>
          <p className="text-sm">Sprint 2 — Story 14.1 Test</p>
        </div>

        <AudioRecorderTest />
      </div>
    </div>
  );
}
