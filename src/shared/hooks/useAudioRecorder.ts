// Audio recording hook with automatic fallback
//
// Plan A: tauri-plugin-mic-recorder (Rust-native, WAV direct)
// Plan B: Web Audio API (getUserMedia → resample 16kHz → WAV → Rust save)
//
// The plan is detected once on first recording attempt.
// If Plan A fails, Plan B is used for all subsequent recordings.

import { useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { startRecording as pluginStart, stopRecording as pluginStop } from 'tauri-plugin-mic-recorder-api';
import { startWebAudioRecording, type WebAudioSession } from '../utils/webAudioRecorder';

export type RecordingState = 'idle' | 'recording' | 'processing' | 'error';
export type AudioPlan = 'unknown' | 'plugin' | 'web-audio';

interface UseAudioRecorderReturn {
  state: RecordingState;
  audioPath: string | null;
  duration: number;
  audioLevel: number;
  error: string | null;
  activePlan: AudioPlan;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  clearError: () => void;
}

// Singleton: once we know which plan works, we stick with it
let detectedPlan: AudioPlan = 'unknown';

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<AudioPlan>(detectedPlan);

  const startTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const webSessionRef = useRef<WebAudioSession | null>(null);

  const startDurationCounter = useCallback(() => {
    startTimeRef.current = Date.now();
    durationIntervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 100);
  }, []);

  const stopDurationCounter = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    setDuration(0);
    startTimeRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    setState('recording');
    setError(null);
    setAudioPath(null);
    setAudioLevel(0);

    // Try Plan A first if we haven't detected yet
    if (detectedPlan === 'unknown' || detectedPlan === 'plugin') {
      try {
        await pluginStart();
        detectedPlan = 'plugin';
        setActivePlan('plugin');
        startDurationCounter();
        console.log('Audio: Plan A (tauri-plugin-mic-recorder) active');
        return;
      } catch (err) {
        if (detectedPlan === 'plugin') {
          // Plugin was working before but failed now
          console.error('Plan A failed:', err);
          setState('error');
          setError('Erreur du plugin audio. Réessayez.');
          return;
        }
        // First time: plugin failed, try Plan B
        console.warn('Plan A failed, switching to Plan B (Web Audio API):', err);
      }
    }

    // Plan B: Web Audio API
    try {
      const session = await startWebAudioRecording({
        onAudioLevel: setAudioLevel,
      });
      webSessionRef.current = session;
      detectedPlan = 'web-audio';
      setActivePlan('web-audio');
      startDurationCounter();
      console.log('Fallback: Web Audio API active');
    } catch (err) {
      console.error('Plan B failed:', err);
      setState('error');
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de démarrer l\'enregistrement. Vérifiez que le microphone est accessible.'
      );
    }
  }, [startDurationCounter]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    setState('processing');
    stopDurationCounter();
    setAudioLevel(0);

    try {
      let filePath: string;

      if (detectedPlan === 'plugin') {
        // Plan A: plugin returns the file path directly
        filePath = await pluginStop();
        if (!filePath || filePath.trim().length === 0) {
          throw new Error('Aucun fichier audio généré par le plugin');
        }
      } else {
        // Plan B: get WAV bytes from Web Audio, send to Rust to save
        const session = webSessionRef.current;
        if (!session) {
          throw new Error('Session Web Audio non initialisée');
        }
        webSessionRef.current = null;

        const wavBytes = await session.stop();
        filePath = await invoke<string>('save_wav_file', {
          wavData: Array.from(wavBytes),
        });
      }

      setAudioPath(filePath);
      setState('idle');
      return filePath;
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setState('error');
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors de l\'arrêt de l\'enregistrement'
      );
      return null;
    }
  }, [stopDurationCounter]);

  const clearError = useCallback(() => {
    setError(null);
    setState('idle');
  }, []);

  return {
    state,
    audioPath,
    duration,
    audioLevel,
    error,
    activePlan,
    startRecording,
    stopRecording,
    clearError,
  };
}
