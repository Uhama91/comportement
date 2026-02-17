import { useEffect, useRef, useCallback } from 'react';
import { useTranscription } from '../../../shared/hooks/useTranscription';

interface InlineDictationProps {
  onTranscriptionComplete: (text: string) => void;
  disabled?: boolean;
}

export function InlineDictation({ onTranscriptionComplete, disabled }: InlineDictationProps) {
  const { state, text, error, startRecording, stopAndTranscribe, retry, clearError } = useTranscription();
  const callbackRef = useRef(onTranscriptionComplete);
  callbackRef.current = onTranscriptionComplete;
  const stateRef = useRef(state);
  stateRef.current = state;

  // When transcription completes, pass text to parent and reset
  useEffect(() => {
    if (state === 'done' && text) {
      callbackRef.current(text);
      retry();
    }
  }, [state, text, retry]);

  // Use refs for handlers so the same DOM element handles both down and up
  const handlePointerDown = useCallback(async () => {
    if (disabled) return;
    const s = stateRef.current;
    if (s === 'processing') return;
    if (s === 'error') clearError();
    await startRecording();
  }, [disabled, startRecording, clearError]);

  const handlePointerUp = useCallback(async () => {
    if (stateRef.current !== 'recording') return;
    await stopAndTranscribe();
  }, [stopAndTranscribe]);

  // Single button element — never swapped out, just changes appearance
  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';
  const isError = state === 'error';

  if (isProcessing) {
    return (
      <span className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500">
        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
        </svg>
      </span>
    );
  }

  if (isError) {
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

  // Single button for idle + recording — same DOM element persists across re-renders
  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      disabled={disabled}
      className={`px-2 py-1 text-xs rounded transition-colors ${
        isRecording
          ? 'bg-red-100 text-red-600 animate-pulse'
          : disabled
            ? 'text-slate-300 cursor-not-allowed'
            : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
      }`}
      title={
        isRecording ? 'Relacher pour transcrire'
          : disabled ? 'Modele Whisper non installe'
            : 'Maintenir pour dicter'
      }
    >
      {isRecording ? (
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 bg-red-500 rounded-full" />
          Enreg...
        </span>
      ) : '🎤'}
    </button>
  );
}
