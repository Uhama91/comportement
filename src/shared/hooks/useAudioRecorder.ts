// Audio recording hook using tauri-plugin-mic-recorder (Plan A)
// Captures audio in WAV PCM 16-bit 16kHz mono format for Whisper.cpp
// Automatically requests microphone permission on first use

import { useState, useRef, useCallback } from 'react';
import { startRecording as startRecordingAPI, stopRecording as stopRecordingAPI } from 'tauri-plugin-mic-recorder-api';

export type RecordingState = 'idle' | 'recording' | 'processing' | 'error';

interface UseAudioRecorderReturn {
  state: RecordingState;
  audioPath: string | null;
  duration: number;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  clearError: () => void;
}

/**
 * Hook for recording audio using tauri-plugin-mic-recorder
 * Format: WAV PCM 16-bit, 16kHz, mono (optimized for Whisper.cpp)
 *
 * The plugin handles:
 * - Audio capture from system default microphone
 * - WAV file generation in temp directory
 * - Automatic permission request on first use
 *
 * @returns Audio recording controls and state
 */
export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const startTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setState('recording');
      setError(null);
      setAudioPath(null);

      // Start recording via plugin
      // The plugin will automatically request microphone permission on first use
      // Audio format is configured in Rust: WAV PCM 16-bit, 16kHz, mono
      await startRecordingAPI();

      // Start duration counter
      startTimeRef.current = Date.now();
      durationIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 100);

    } catch (err) {
      console.error('Failed to start recording:', err);
      setState('error');
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de démarrer l\'enregistrement. Vérifiez que le microphone est accessible.'
      );

      // Clean up interval on error
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      setState('processing');

      // Clear duration interval
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // Stop recording and get the WAV file path
      const filePath = await stopRecordingAPI();

      if (!filePath || filePath.trim().length === 0) {
        throw new Error('Aucun fichier audio généré');
      }

      setAudioPath(filePath);
      setState('idle');
      setDuration(0);
      startTimeRef.current = null;

      return filePath;

    } catch (err) {
      console.error('Failed to stop recording:', err);
      setState('error');
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors de l\'arrêt de l\'enregistrement'
      );

      setDuration(0);
      startTimeRef.current = null;

      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setState('idle');
  }, []);

  return {
    state,
    audioPath,
    duration,
    error,
    startRecording,
    stopRecording,
    clearError,
  };
}
