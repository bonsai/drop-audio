import { spawn } from "child_process";

const PEAK_COUNT = 400;

export interface WaveformData {
  duration: number;
  peaks: number[];
  sampleRate: number;
  channels: number;
}

export async function generateWaveform(
  filePath: string
): Promise<WaveformData> {
  // Try ffmpeg first — it gives us everything
  try {
    return await decodeWithFfmpeg(filePath);
  } catch {
    // ffmpeg not available — placeholder
    return {
      duration: 0,
      peaks: new Array(PEAK_COUNT).fill(0.5),
      sampleRate: 44100,
      channels: 2,
    };
  }
}

function decodeWithFfmpeg(filePath: string): Promise<WaveformData> {
  return new Promise((resolve, reject) => {
    // Spawn ffmpeg to decode audio to raw PCM and also probe duration
    const ff = spawn("ffmpeg", [
      "-i", filePath,
      "-f", "s16le",
      "-acodec", "pcm_s16le",
      "-ac", "1",
      "-ar", "44100",
      "-vn",
      "-loglevel", "error",
      "pipe:1",
    ]);

    const chunks: Buffer[] = [];
    let stderr = "";

    ff.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    ff.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    ff.on("error", (err) => reject(err));
    ff.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
      }

      const raw = Buffer.concat(chunks);
      const sampleCount = Math.floor(raw.length / 2);
      if (sampleCount === 0) {
        return reject(new Error("No audio data decoded"));
      }

      const duration = sampleCount / 44100;
      const samplesPerPeak = Math.max(1, Math.floor(sampleCount / PEAK_COUNT));

      // Compute peaks
      const rawPeaks: number[] = [];
      let maxInWindow = 0;
      let counter = 0;

      for (let i = 0; i < sampleCount; i++) {
        const sample = raw.readInt16LE(i * 2);
        const normalized = Math.abs(sample / 32768);
        if (normalized > maxInWindow) maxInWindow = normalized;

        counter++;
        if (counter >= samplesPerPeak) {
          rawPeaks.push(maxInWindow);
          maxInWindow = 0;
          counter = 0;
        }
      }
      if (counter > 0) rawPeaks.push(maxInWindow);

      // Resize to exactly PEAK_COUNT
      const peaks = resizePeaks(rawPeaks, PEAK_COUNT);

      resolve({
        duration,
        peaks,
        sampleRate: 44100,
        channels: 1,
      });
    });
  });
}

function resizePeaks(peaks: number[], target: number): number[] {
  if (peaks.length === target) return peaks;
  if (peaks.length === 0) return new Array(target).fill(0);

  const result: number[] = [];
  const ratio = peaks.length / target;
  for (let i = 0; i < target; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.floor((i + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let j = start; j < end && j < peaks.length; j++) {
      sum += peaks[j];
      count++;
    }
    result.push(count > 0 ? sum / count : 0);
  }
  return result;
}
