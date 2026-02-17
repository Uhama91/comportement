import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ObservationResult, StructurationResult, InsertResult } from '../../../shared/types';

type StructurationState = 'idle' | 'structuring' | 'reviewing' | 'saving' | 'done' | 'error';

interface UseStructurationReturn {
  state: StructurationState;
  observations: ObservationResult[];
  durationMs: number | null;
  error: string | null;

  structureText: (text: string, studentName: string) => Promise<void>;
  updateObservation: (index: number, obs: ObservationResult) => void;
  addObservation: () => void;
  removeObservation: (index: number) => void;
  validateAndSave: (eleveId: number, periodeId: number, originalText: string) => Promise<boolean>;
  retryManual: () => void;
  reset: () => void;
}

export function useStructuration(): UseStructurationReturn {
  const [state, setState] = useState<StructurationState>('idle');
  const [observations, setObservations] = useState<ObservationResult[]>([]);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const structureText = async (text: string, studentName: string) => {
    setState('structuring');
    setError(null);
    setDurationMs(null);

    try {
      const result = await invoke<StructurationResult>('structure_text', {
        text,
        studentName,
      });

      setObservations(result.observations);
      setDurationMs(result.duration_ms);
      setState('reviewing');
    } catch (err) {
      const msg = String(err);
      setError(msg);
      setState('error');
    }
  };

  const updateObservation = (index: number, obs: ObservationResult) => {
    setObservations(prev => prev.map((o, i) => i === index ? obs : o));
  };

  const addObservation = () => {
    setObservations(prev => [...prev, { domaine: '', niveau: 'en_cours_acquisition', commentaire: '' }]);
  };

  const removeObservation = (index: number) => {
    setObservations(prev => prev.filter((_, i) => i !== index));
  };

  const validateAndSave = async (eleveId: number, periodeId: number, originalText: string): Promise<boolean> => {
    setState('saving');
    setError(null);

    try {
      const result = await invoke<InsertResult>('validate_and_insert_observations', {
        observations,
        eleveId,
        periodeId,
        originalText,
      });

      if (result.success) {
        setState('done');
        return true;
      } else {
        setError('Validation echouee');
        setState('error');
        return false;
      }
    } catch (err) {
      setError(String(err));
      setState('error');
      return false;
    }
  };

  const retryManual = () => {
    setState('idle');
    setError(null);
  };

  const reset = () => {
    setState('idle');
    setObservations([]);
    setDurationMs(null);
    setError(null);
  };

  return {
    state,
    observations,
    durationMs,
    error,
    structureText,
    updateObservation,
    addObservation,
    removeObservation,
    validateAndSave,
    retryManual,
    reset,
  };
}
