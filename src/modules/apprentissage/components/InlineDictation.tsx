import { useEffect, useRef } from 'react';
import { useTranscription } from '../../../shared/hooks/useTranscription';

interface InlineDictationProps {
  onTranscriptionComplete: (text: string) => void;
  disabled?: boolean;
}

export function InlineDictation({ onTranscriptionComplete, disabled }: InlineDictationProps) {
  const { state, text, error, startRecording, stopAndTranscribe, retry, clearError } = useTranscription();
  const callbackRef = useRef(onTranscriptionComplete);
  callbackRef.current = onTranscriptionComplete;

  // When transcription completes, pass text to parent and reset
  useEffect(() => {
    if (state === 'done' && text) {
      callbackRef.current(text);
      retry();
    }
  }, [state, text, retry]);

  const handlePointerDown = async () => {
    if (disabled || state === 'processing') return;
    if (state === 'error') clearError();
    await startRecording();
  };

  const handlePointerUp = async () => {
    if (state !== 'recording') return;
    await stopAndTranscribe();
  };

  if (state === 'recording') {
    return (
      <button
        onPointerUp={handlePointerUp}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-600 rounded animate-pulse"
        title="Relacher pour transcrire"
      >
        <span className="inline-block w-2 h-2 bg-red-500 rounded-full" />
        Enregistrement...
      </button>
    );
  }

  if (state === 'processing') {
    return (
      <span className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500">
        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
        </svg>
        Transcription...
      </span>
    );
  }

  if (state === 'error') {
    return (
      <button
        onClick={() => clearError()}
        className="px-2 py-1 text-xs text-red-500 hover:text-red-700"
        title={error?.message || 'Erreur'}
      >
        Reessayer
      </button>
    );
  }

  // idle
  return (
    <button
      onPointerDown={handlePointerDown}
      disabled={disabled}
      className={`px-2 py-1 text-xs rounded transition-colors ${
        disabled
          ? 'text-slate-300 cursor-not-allowed'
          : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
      }`}
      title={disabled ? 'Modele Whisper non installe' : 'Maintenir pour dicter'}
    >
      🎤
    </button>
  );
}
