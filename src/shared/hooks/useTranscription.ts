// Orchestration hook: push-to-talk → capture → whisper-server → text
//
// State machine: idle → recording → processing → done | error
// Wraps useAudioRecorder for capture, invokes transcribe_audio for STT.
// Story 14.3

import { useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAudioRecorder } from './useAudioRecorder';
import type { TranscriptionResult } from '../types';

export type TranscriptionState = 'idle' | 'recording' | 'processing' | 'done' | 'error';

export type TranscriptionError =
  | 'timeout'
  | 'empty_response'
  | 'model_not_found'
  | 'network'
  | 'microphone'
  | 'unknown';

interface ErrorInfo {
  type: TranscriptionError;
  message: string;
}

interface UseTranscriptionReturn {
  state: TranscriptionState;
  text: string;
  error: ErrorInfo | null;
  /** Recording duration in seconds (live) */
  recordingDuration: number;
  /** Audio level 0-1 (live during recording) */
  audioLevel: number;
  /** Transcription time in ms (after processing) */
  transcriptionDurationMs: number | null;
  /** Which audio plan is active */
  activePlan: 'unknown' | 'plugin' | 'web-audio';
  /** Start recording (call on mousedown/pointerdown) */
  startRecording: () => Promise<void>;
  /** Stop recording and start transcription (call on mouseup/pointerup) */
  stopAndTranscribe: () => Promise<void>;
  /** Re-dictate: clear text and go back to idle */
  retry: () => void;
  /** Clear text only, stay in done state */
  clearText: () => void;
  /** Set text manually (for editing in textarea) */
  setText: (text: string) => void;
  /** Clear error and go back to idle */
  clearError: () => void;
}

const TRANSCRIPTION_TIMEOUT_MS = 30_000;

function classifyError(errorStr: string): ErrorInfo {
  const lower = errorStr.toLowerCase();

  if (lower.includes('modele') && lower.includes('introuvable') || lower.includes('model') && lower.includes('not found') || lower.includes('modeles ia non installes') || lower.includes('modelnotfound')) {
    return {
      type: 'model_not_found',
      message: 'Modeles IA non installes. Allez dans Parametres > Modeles IA.',
    };
  }

  if (lower.includes('timeout') || lower.includes('delai')) {
    return {
      type: 'timeout',
      message: 'Transcription trop lente. Reessayez.',
    };
  }

  if (lower.includes('requete vers whisper-server echouee') || lower.includes('connection refused') || lower.includes('connect error')) {
    return {
      type: 'network',
      message: 'Connexion au serveur de transcription echouee. Reessayez.',
    };
  }

  if (lower.includes('microphone') || lower.includes('micro')) {
    return {
      type: 'microphone',
      message: 'Verifiez que le microphone est accessible.',
    };
  }

  return {
    type: 'unknown',
    message: errorStr,
  };
}

export function useTranscription(): UseTranscriptionReturn {
  const recorder = useAudioRecorder();

  const [transcriptionState, setTranscriptionState] = useState<TranscriptionState>('idle');
  const [text, setText] = useState('');
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [transcriptionDurationMs, setTranscriptionDurationMs] = useState<number | null>(null);

  // Abort controller for timeout
  const abortRef = useRef<AbortController | null>(null);

  const startRecording = useCallback(async () => {
    setTranscriptionState('recording');
    setError(null);
    setText('');
    setTranscriptionDurationMs(null);
    await recorder.startRecording();
  }, [recorder]);

  const stopAndTranscribe = useCallback(async () => {
    setTranscriptionState('processing');

    // Stop recording → get WAV file path
    const audioPath = await recorder.stopRecording();

    if (!audioPath) {
      setTranscriptionState('error');
      setError({
        type: 'microphone',
        message: 'Aucun fichier audio genere. Verifiez le microphone.',
      });
      return;
    }

    // Transcribe with timeout
    abortRef.current = new AbortController();

    try {
      const result = await Promise.race([
        invoke<TranscriptionResult>('transcribe_audio', { audioPath }),
        new Promise<never>((_, reject) => {
          const timer = setTimeout(
            () => reject(new Error('Transcription trop lente')),
            TRANSCRIPTION_TIMEOUT_MS,
          );
          abortRef.current?.signal.addEventListener('abort', () => clearTimeout(timer));
        }),
      ]);

      // Empty response check
      if (!result.text || result.text.trim().length === 0) {
        setTranscriptionState('error');
        setError({
          type: 'empty_response',
          message: 'Transcription vide. Verifiez le microphone et parlez plus fort.',
        });
        return;
      }

      setText(result.text);
      setTranscriptionDurationMs(result.duration_ms);
      setTranscriptionState('done');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setTranscriptionState('error');
      setError(classifyError(message));
    } finally {
      abortRef.current = null;
    }
  }, [recorder]);

  const retry = useCallback(() => {
    setText('');
    setError(null);
    setTranscriptionDurationMs(null);
    setTranscriptionState('idle');
  }, []);

  const clearText = useCallback(() => {
    setText('');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setTranscriptionState('idle');
  }, []);

  // Expose a composite state: recorder states feed into transcription states
  // When recorder is in error, surface it as transcription error
  const effectiveState: TranscriptionState = (() => {
    if (recorder.state === 'error' && transcriptionState === 'recording') {
      return 'error';
    }
    return transcriptionState;
  })();

  const effectiveError: ErrorInfo | null = (() => {
    if (recorder.state === 'error' && recorder.error) {
      return classifyError(recorder.error);
    }
    return error;
  })();

  return {
    state: effectiveState,
    text,
    error: effectiveError,
    recordingDuration: recorder.duration,
    audioLevel: recorder.audioLevel,
    transcriptionDurationMs,
    activePlan: recorder.activePlan,
    startRecording,
    stopAndTranscribe,
    retry,
    clearText,
    setText,
    clearError,
  };
}
