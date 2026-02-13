// Test component for audio recording (Stories 14.1 + 14.2)
// Tests both Plan A (plugin) and Plan B (Web Audio API fallback)

import { useAudioRecorder } from '../hooks/useAudioRecorder';

export function AudioRecorderTest() {
  const { state, audioPath, duration, error, activePlan, startRecording, stopRecording, clearError } =
    useAudioRecorder();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-md">
      <h2 className="text-xl font-bold mb-4">Audio Recorder Test (Story 14.1)</h2>

      <div className="space-y-4">
        {/* Status */}
        <div className="text-sm text-slate-600 space-y-1">
          <div>Status: <span className="font-semibold">{state}</span></div>
          <div>
            Plan:{' '}
            <span className={`font-semibold ${activePlan === 'web-audio' ? 'text-amber-600' : 'text-blue-600'}`}>
              {activePlan === 'unknown' ? 'non détecté' : activePlan === 'plugin' ? 'A (plugin)' : 'B (Web Audio)'}
            </span>
          </div>
        </div>

        {/* Duration counter */}
        {state === 'recording' && (
          <div className="text-2xl font-mono text-red-600">
            🔴 {formatDuration(duration)}
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          <button
            onClick={startRecording}
            disabled={state === 'recording' || state === 'processing'}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            Start Recording
          </button>

          <button
            onClick={stopRecording}
            disabled={state !== 'recording'}
            className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50"
          >
            Stop Recording
          </button>
        </div>

        {/* Audio path result */}
        {audioPath && (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
            <div className="font-semibold text-green-800">Recording saved:</div>
            <div className="text-green-700 break-all">{audioPath}</div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <div className="font-semibold text-red-800">Error:</div>
            <div className="text-red-700">{error}</div>
            <button
              onClick={clearError}
              className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded"
            >
              Clear Error
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-slate-500 pt-4 border-t">
          <strong>Expected behavior:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Click "Start Recording" → permission prompt appears (first time)</li>
            <li>Duration counter appears in red while recording</li>
            <li>Click "Stop Recording" → file path displayed</li>
            <li>Format: WAV PCM 16-bit, 16kHz, mono (for Whisper.cpp)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
