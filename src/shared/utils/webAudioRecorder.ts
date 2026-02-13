// Web Audio API recorder (Plan B fallback)
// Captures audio via getUserMedia, resamples to 16kHz mono,
// and produces WAV PCM 16-bit bytes for Whisper.cpp compatibility.

const TARGET_SAMPLE_RATE = 16000;
const BIT_DEPTH = 16;
const NUM_CHANNELS = 1;

export interface WebAudioSession {
  stop: () => Promise<Uint8Array>;
}

export interface WebAudioRecordingOptions {
  onAudioLevel?: (level: number) => void;
}

/**
 * Start recording audio using the Web Audio API.
 * Returns a session object with a stop() method that resolves to WAV bytes.
 *
 * @throws Error if no microphone is available or permission denied
 */
export async function startWebAudioRecording(
  options?: WebAudioRecordingOptions,
): Promise<WebAudioSession> {
  let stream: MediaStream;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: { ideal: TARGET_SAMPLE_RATE },
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
  } catch (err) {
    if (err instanceof DOMException) {
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('Aucun microphone détecté');
      }
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Permission micro refusée. Autorisez l\'accès au microphone dans les paramètres.');
      }
    }
    throw new Error(`Erreur micro: ${err}`);
  }

  const audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
  const source = audioContext.createMediaStreamSource(stream);
  const chunks: Float32Array[] = [];

  // ScriptProcessorNode is deprecated but widely supported and simpler
  // than AudioWorklet for our use case (short recordings, not real-time streaming)
  const bufferSize = 4096;
  const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

  processor.onaudioprocess = (event) => {
    const inputData = event.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(inputData));

    // Compute RMS audio level (0-1) for VU meter
    if (options?.onAudioLevel) {
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      // Amplify for better visual range (RMS of speech is typically 0.01-0.1)
      const level = Math.min(1, rms * 5);
      options.onAudioLevel(level);
    }
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  return {
    stop: async (): Promise<Uint8Array> => {
      // Disconnect and stop
      processor.disconnect();
      source.disconnect();
      stream.getTracks().forEach((track) => track.stop());

      // Merge all chunks
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      // Resample if AudioContext didn't give us 16kHz
      let pcmFloat: Float32Array;
      if (audioContext.sampleRate !== TARGET_SAMPLE_RATE) {
        pcmFloat = resample(merged, audioContext.sampleRate, TARGET_SAMPLE_RATE);
      } else {
        pcmFloat = merged;
      }

      await audioContext.close();

      // Convert float32 to int16 PCM
      const pcmInt16 = float32ToInt16(pcmFloat);

      // Build WAV file
      return buildWav(pcmInt16, TARGET_SAMPLE_RATE, NUM_CHANNELS, BIT_DEPTH);
    },
  };
}

/**
 * Resample audio from source rate to target rate using linear interpolation.
 */
function resample(
  input: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  const ratio = fromRate / toRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcFloor = Math.floor(srcIndex);
    const srcCeil = Math.min(srcFloor + 1, input.length - 1);
    const frac = srcIndex - srcFloor;
    output[i] = input[srcFloor] * (1 - frac) + input[srcCeil] * frac;
  }

  return output;
}

/**
 * Convert Float32Array (-1.0 to 1.0) to Int16 PCM.
 */
function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return int16;
}

/**
 * Build a complete WAV file from Int16 PCM data.
 */
function buildWav(
  pcm: Int16Array,
  sampleRate: number,
  channels: number,
  bitDepth: number,
): Uint8Array {
  const bytesPerSample = bitDepth / 8;
  const dataSize = pcm.length * bytesPerSample;
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, headerSize - 8 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true); // byte rate
  view.setUint16(32, channels * bytesPerSample, true); // block align
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // PCM samples
  const pcmBytes = new Uint8Array(pcm.buffer);
  new Uint8Array(buffer).set(pcmBytes, headerSize);

  return new Uint8Array(buffer);
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
