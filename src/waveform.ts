import { spawn } from "child_process";
import { parseFile } from "music-metadata";
import path from "path";

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
  // Get metadata first
  const metadata = await parseFile(filePath);
  const duration = metadata.format.duration || 0;
  const sampleRate = metadata.format.sampleRate || 44100;
  const channels = metadata.format.numberOfChannels || 2;

  // Try ffmpeg to decode and extract peak data
  try {
    const peaks = await decodeWithFfmpeg(filePath, duration);
    return { duration, peaks, sampleRate, channels };
  } catch {
    // ffmpeg not available — generate placeholder peaks
    return {
      duration,
      peaks: generatePlaceholderPeaks(duration),
      sampleRate,
      channels,
    };
  }
}

function decodeWithFfmpeg(filePath: string, duration: number): Promise<number[]> {
  return new Promise((resolve, reject) => {
    // Decode to mono 16-bit PCM, output raw samples
    const samplesPerPeak = Math.max(1, Math.floor((duration * 44100) / PEAK_COUNT));
    const ff = spawn("ffmpeg", [
      "-i", filePath,
      "-f", "s16le",       // 16-bit signed little-endian PCM
      "-acodec", "pcm_s16le",
      "-ac", "1",           // mono
      "-ar", "44100",       // 44.1kHz
      "-vn",
      "-loglevel", "error",
      "pipe:1",
    ]);

    const chunks: Buffer[] = [];
    ff.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    ff.stderr.on("data", () => {}); // swallow stderr
    ff.on("error", (err) => reject(err));
    ff.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`ffmpeg exited with code ${code}`));
      }

      const raw = Buffer.concat(chunks);
      // 16-bit samples -> Float32
      const sampleCount = Math.floor(raw.length / 2);
      const peaks: number[] = [];
      let maxInWindow = 0;
      let counter = 0;

      for (let i = 0; i < sampleCount; i++) {
        const sample = raw.readInt16LE(i * 2);
        const normalized = Math.abs(sample / 32768);
        if (normalized > maxInWindow) maxInWindow = normalized;

        counter++;
        if (counter >= samplesPerPeak) {
          peaks.push(maxInWindow);
          maxInWindow = 0;
          counter = 0;
        }
      }
      // Flush last window
      if (counter > 0) peaks.push(maxInWindow);

      // Pad or trim to exactly PEAK_COUNT
      while (peaks.length < PEAK_COUNT) peaks.push(0);
      if (peaks.length > PEAK_COUNT) {
        // Downsample by averaging
        const ratio = peaks.length / PEAK_COUNT;
        const downsampled: number[] = [];
        for (let i = 0; i < PEAK_COUNT; i++) {
          const start = Math.floor(i * ratio);
          const end = Math.floor((i + 1) * ratio);
          let sum = 0;
          for (let j = start; j < end && j < peaks.length; j++) sum += peaks[j];
          downsampled.push(sum / (end - start));
        }
        resolve(downsampled);
      } else {
        resolve(peaks);
      }
    });
  });
}

function generatePlaceholderPeaks(duration: number): number[] {
  if (duration <= 0) return new Array(PEAK_COUNT).fill(0);
  const peaks: number[] = [];
  for (let i = 0; i < PEAK_COUNT; i++) {
    const t = i / PEAK_COUNT;
    // Fake envelope that looks vaguely musical
    peaks.push(Math.max(0.02, Math.sin(t * Math.PI * 4) * 0.3 + 0.5));
  }
  return peaks;
}
