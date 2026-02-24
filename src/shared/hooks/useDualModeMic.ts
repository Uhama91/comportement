// Story 22.3 — Dual-mode mic hook (ADR-016)
//
// Tap court (<300ms) = toggle continu (start/stop)
// Press long (>300ms) = push-to-talk (start on press, stop on release)
//
// Wraps useTranscription for audio capture + Whisper STT.
// Feeds dictationStore for LLM classification pipeline.

import { useCallback, useRef } from 'react';
import { useTranscription } from './useTranscription';
import { useDictationStore } from '../stores/dictationStore';

const TAP_THRESHOLD_MS = 300;

interface UseDualModeMicOptions {
  eleveId: number;
  periodeId: number | null;
  disabled?: boolean;
}

interface UseDualModeMicReturn {
  /** Pointer handlers to attach to the mic button */
  onPointerDown: () => void;
  onPointerUp: () => void;
  /** True while recording (either mode) */
  isRecording: boolean;
  /** True while processing (Whisper STT) */
  isProcessing: boolean;
  /** Recording duration in seconds */
  duration: number;
  /** Audio level 0-1 */
  audioLevel: number;
}

export function useDualModeMic({ eleveId, periodeId, disabled }: UseDualModeMicOptions): UseDualModeMicReturn {
  const { state, startRecording, stopAndTranscribe, retry, clearError, recordingDuration, audioLevel, text } =
    useTranscription();
  const { setState, setTranscribedText, setContext, setError, classifyText, clear } = useDictationStore();

  const pressStartRef = useRef<number>(0);
  const modeRef = useRef<'idle' | 'toggle' | 'ptt'>('idle');
  const stateRef = useRef(state);
  stateRef.current = state;

  // Sync transcription state → dictationStore (same pattern as ToolbarMic)
  const textRef = useRef(text);
  textRef.current = text;

  const handleTranscriptionDone = useCallback(() => {
    const t = textRef.current;
    if (t) {
      setTranscribedText(t);
      setContext(eleveId, periodeId);
      setState('done');
      retry(); // reset useTranscription
      classifyText(); // auto-launch LLM classification
    }
  }, [eleveId, periodeId, setTranscribedText, setContext, setState, retry, classifyText]);

  // Watch for transcription completion
  const prevStateRef = useRef(state);
  if (prevStateRef.current !== state) {
    if (state === 'done' && textRef.current) {
      // Use queueMicrotask to avoid setState during render
      queueMicrotask(handleTranscriptionDone);
    } else if (state === 'recording') {
      queueMicrotask(() => setState('recording'));
    } else if (state === 'processing') {
      queueMicrotask(() => setState('processing'));
    } else if (state === 'error') {
      queueMicrotask(() => {
        setState('error');
        setError('Erreur de transcription');
      });
    }
    prevStateRef.current = state;
  }

  const onPointerDown = useCallback(() => {
    if (disabled || periodeId == null) return;

    const s = stateRef.current;

    // If currently recording in toggle mode → stop (tap toggles off)
    if (s === 'recording' && modeRef.current === 'toggle') {
      modeRef.current = 'idle';
      stopAndTranscribe();
      return;
    }

    // If processing/classifying, ignore
    if (s === 'processing') return;

    // Clear previous state
    if (s === 'error') clearError();
    clear();

    // Mark press start time
    pressStartRef.current = Date.now();
    modeRef.current = 'idle'; // will decide on release

    // Always start recording immediately
    startRecording();
  }, [disabled, periodeId, startRecording, stopAndTranscribe, clearError, clear]);

  const onPointerUp = useCallback(() => {
    if (stateRef.current !== 'recording') return;

    const pressDuration = Date.now() - pressStartRef.current;

    if (pressDuration < TAP_THRESHOLD_MS) {
      // Short tap → toggle mode (keep recording, will stop on next tap)
      modeRef.current = 'toggle';
    } else {
      // Long press → push-to-talk (stop now)
      modeRef.current = 'idle';
      stopAndTranscribe();
    }
  }, [stopAndTranscribe]);

  return {
    onPointerDown,
    onPointerUp,
    isRecording: state === 'recording',
    isProcessing: state === 'processing',
    duration: recordingDuration,
    audioLevel,
  };
}
