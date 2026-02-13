// VoiceDictation — Push-to-talk → transcription component
//
// 4 visual states: idle, recording, processing, done
// Props:
//   mode: "full" (with Structurer button) | "transcription-only"
//   onTranscriptionComplete: callback with final text
//   onStructure: callback when "Structurer" is clicked
//
// Story 14.3 — Pipeline audio complet

import { useCallback, useRef, useEffect } from 'react';
import { useTranscription } from '../hooks/useTranscription';

interface VoiceDictationProps {
  mode?: 'full' | 'transcription-only';
  onTranscriptionComplete?: (text: string) => void;
  onStructure?: (text: string) => void;
}

export function VoiceDictation({
  mode = 'full',
  onTranscriptionComplete,
  onStructure,
}: VoiceDictationProps) {
  const {
    state,
    text,
    error,
    recordingDuration,
    audioLevel,
    transcriptionDurationMs,
    startRecording,
    stopAndTranscribe,
    retry,
    clearText,
    setText,
    clearError,
  } = useTranscription();

  const buttonRef = useRef<HTMLButtonElement>(null);
  const prevStateRef = useRef(state);

  // Notify parent when transcription completes
  useEffect(() => {
    if (prevStateRef.current === 'processing' && state === 'done' && text) {
      onTranscriptionComplete?.(text);
    }
    prevStateRef.current = state;
  }, [state, text, onTranscriptionComplete]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      // Capture pointer so mouseup fires even if cursor leaves button
      buttonRef.current?.setPointerCapture(e.pointerId);
      startRecording();
    },
    [startRecording],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      buttonRef.current?.releasePointerCapture(e.pointerId);
      if (state === 'recording') {
        stopAndTranscribe();
      }
    },
    [state, stopAndTranscribe],
  );

  // Keyboard: Space/Enter to start, release to stop
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && state === 'idle') {
        e.preventDefault();
        startRecording();
      }
    },
    [state, startRecording],
  );

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && state === 'recording') {
        e.preventDefault();
        stopAndTranscribe();
      }
    },
    [state, stopAndTranscribe],
  );

  const handleStructure = useCallback(() => {
    if (text.trim()) {
      onStructure?.(text);
    }
  }, [text, onStructure]);

  // === RENDER STATES ===

  // IDLE
  if (state === 'idle') {
    return (
      <div className="voice-dictation flex flex-col items-center gap-4">
        <button
          ref={buttonRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          className="px-8 py-4 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white
                     font-semibold rounded-xl text-lg select-none cursor-pointer
                     transition-colors min-h-[56px] min-w-[280px]
                     focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          aria-label="Maintenir enfonce pour enregistrer"
        >
          MAINTENIR POUR DICTER
        </button>
        <p className="text-xs text-slate-400">
          Maintenez le bouton et parlez, relacher pour transcrire
        </p>
      </div>
    );
  }

  // RECORDING
  if (state === 'recording') {
    // Audio level bar width (0-100%)
    const levelPercent = Math.round(audioLevel * 100);

    return (
      <div className="voice-dictation flex flex-col items-center gap-4">
        <button
          ref={buttonRef}
          onPointerUp={handlePointerUp}
          onKeyUp={handleKeyUp}
          className="px-8 py-4 bg-red-500 text-white font-semibold rounded-xl text-lg
                     select-none cursor-pointer min-h-[56px] min-w-[280px]
                     animate-pulse-red
                     focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
          aria-label="Relacher pour arreter l'enregistrement"
          aria-live="polite"
        >
          RELACHER POUR ARRETER
        </button>

        {/* Audio level meter */}
        <div className="w-64 h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full transition-[width] duration-100"
            style={{ width: `${levelPercent}%` }}
            role="meter"
            aria-valuenow={levelPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Niveau audio"
          />
        </div>

        {/* Duration */}
        <div className="text-xl font-mono text-red-600">
          {formatDuration(recordingDuration)}
        </div>
      </div>
    );
  }

  // PROCESSING
  if (state === 'processing') {
    return (
      <div className="voice-dictation flex flex-col items-center gap-4">
        <div className="text-slate-600 font-medium">Transcription en cours...</div>

        {/* Indeterminate progress bar */}
        <div className="w-64 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full animate-progress-indeterminate" />
        </div>

        <p className="text-xs text-slate-400">Whisper analyse l'audio...</p>
      </div>
    );
  }

  // ERROR
  if (state === 'error' && error) {
    return (
      <div className="voice-dictation flex flex-col items-center gap-4 max-w-md">
        <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg text-center">
          <div className="text-red-700 font-medium mb-2">{error.message}</div>

          <div className="flex justify-center gap-3">
            {error.type !== 'model_not_found' && (
              <button
                onClick={retry}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg
                           text-sm font-medium transition-colors"
              >
                Reessayer
              </button>
            )}
            <button
              onClick={clearError}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg
                         text-sm font-medium transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // DONE
  if (state === 'done') {
    return (
      <div className="voice-dictation flex flex-col gap-4 w-full max-w-lg">
        <label className="text-sm font-medium text-slate-600">
          Transcription
          {transcriptionDurationMs != null && (
            <span className="ml-2 text-xs text-slate-400 font-normal">
              ({(transcriptionDurationMs / 1000).toFixed(1)}s)
            </span>
          )}
        </label>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full p-3 border border-slate-300 rounded-lg text-sm resize-y
                     min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-400
                     focus:border-transparent"
          placeholder="Texte transcrit..."
        />

        <div className="flex gap-3 justify-end">
          <button
            onClick={retry}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg
                       text-sm font-medium transition-colors"
          >
            Re-dicter
          </button>
          <button
            onClick={clearText}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg
                       text-sm font-medium transition-colors"
          >
            Effacer
          </button>
          {mode === 'full' && (
            <button
              onClick={handleStructure}
              disabled={!text.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg
                         text-sm font-medium transition-colors disabled:opacity-50"
            >
              Structurer &rarr;
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
