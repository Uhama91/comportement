// Story 19.2 — Global toolbar microphone (push-to-talk)
// Replaces per-domain InlineDictation with a single mic button

import { useCallback, useRef, useState, useEffect } from 'react';
import { useTranscription } from '../../../shared/hooks/useTranscription';
import { useDictationStore } from '../../../shared/stores/dictationStore';

interface ToolbarMicProps {
  eleveId: number | null;
  periodeId: number | null;
  disabled: boolean;
}

export function ToolbarMic({ eleveId, periodeId, disabled }: ToolbarMicProps) {
  const { state, text, error, startRecording, stopAndTranscribe, retry, clearError } = useTranscription();
  const { setState, setTranscribedText, setError, setContext, clear, classifyText,
    state: dictationState } = useDictationStore();
  const stateRef = useRef(state);
  stateRef.current = state;

  const [tooltip, setTooltip] = useState<string | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync transcription state → dictationStore
  useEffect(() => {
    if (state === 'recording') setState('recording');
    else if (state === 'processing') setState('processing');
    else if (state === 'error') {
      setState('error');
      setError(error?.message || 'Erreur inconnue');
    }
  }, [state, error, setState, setError]);

  // When transcription completes → write to dictationStore + auto-classify (Story 19.4)
  useEffect(() => {
    if (state === 'done' && text) {
      setTranscribedText(text);
      setContext(eleveId, periodeId);
      setState('done');
      retry(); // reset useTranscription for next recording
      classifyText(); // auto-launch classification pipeline
    }
  }, [state, text, eleveId, periodeId, setTranscribedText, setContext, setState, retry, classifyText]);

  const showTooltip = useCallback((msg: string) => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltip(msg);
    tooltipTimer.current = setTimeout(() => setTooltip(null), 2000);
  }, []);

  const pipelineBusy = dictationState === 'processing' || dictationState === 'done' || dictationState === 'classifying';

  const handlePointerDown = useCallback(async () => {
    if (disabled || pipelineBusy) return;
    if (eleveId === null) {
      showTooltip('Selectionnez un eleve');
      return;
    }
    const s = stateRef.current;
    if (s === 'processing') return;
    if (s === 'error') clearError();
    clear(); // reset dictation store for new recording
    await startRecording();
  }, [disabled, pipelineBusy, eleveId, showTooltip, startRecording, clearError, clear]);

  const handlePointerUp = useCallback(async () => {
    if (stateRef.current !== 'recording') return;
    await stopAndTranscribe();
  }, [stopAndTranscribe]);

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';
  const isError = state === 'error';

  const buttonTitle = isRecording
    ? 'Relacher pour transcrire'
    : isProcessing
      ? 'Transcription en cours...'
      : isError
        ? error?.message || 'Erreur'
        : disabled
          ? 'Modele Whisper non installe'
          : eleveId === null
            ? 'Selectionnez un eleve'
            : 'Maintenir pour dicter';

  return (
    <div className="relative flex items-center gap-1.5">
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        disabled={disabled || isProcessing || pipelineBusy}
        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
          isRecording
            ? 'bg-red-500 text-white animate-pulse'
            : isProcessing
              ? 'bg-slate-100 text-slate-400'
              : isError
                ? 'bg-red-50 text-red-500 hover:bg-red-100'
                : disabled
                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  : 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600'
        }`}
        title={buttonTitle}
      >
        {isRecording ? (
          <span className="inline-block w-2.5 h-2.5 bg-white rounded-full" />
        ) : isProcessing ? (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30 70" />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        )}
      </button>

      {/* Pipeline progress indicator (Story 19.4) */}
      {dictationState === 'processing' && (
        <span className="text-xs text-blue-600 animate-pulse whitespace-nowrap">Transcription...</span>
      )}
      {dictationState === 'classifying' && (
        <span className="text-xs text-indigo-600 animate-pulse whitespace-nowrap">Classification...</span>
      )}

      {/* Floating tooltip */}
      {tooltip && (
        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 text-xs bg-slate-800 text-white rounded shadow-lg z-10">
          {tooltip}
        </div>
      )}
    </div>
  );
}
