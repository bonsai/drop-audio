import dotenv from "dotenv";
dotenv.config();

import path from "path";
import fs from "fs";
import express from "express";
import mp3Router from "./routes/mp3";
import { generateWaveform } from "./waveform";
import { AUDIO_EXTENSIONS, TEXT_EXTENSIONS } from "./dropbox";

const app = express();

app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

app.use("/mp3", mp3Router);

// Local audio files (samples + uploads)
app.get("/samples", (_req, res) => {
  const dirs = ["samples", "uploads"];
  const all: { name: string; path: string; size: number }[] = [];

  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), "public", dir);
    try {
      const files = fs.readdirSync(dirPath).filter(f =>
        [...AUDIO_EXTENSIONS, ...TEXT_EXTENSIONS].some(ext => f.toLowerCase().endsWith(ext))
      );
      for (const name of files) {
        const stat = fs.statSync(path.join(dirPath, name));
        all.push({ name, path: `/${dir}/${name}`, size: stat.size });
      }
    } catch {
      // directory doesn't exist yet
    }
  }

  res.json({ files: all });
});

// Waveform data for local audio files
app.get("/samples/waveform/:filename", async (req, res) => {
  try {
    // Check samples/ first, then uploads/
    const candidates = [
      path.join(process.cwd(), "public", "samples", req.params.filename),
      path.join(process.cwd(), "public", "uploads", req.params.filename),
    ];
    let filePath: string | undefined;
    for (const c of candidates) {
      if (fs.existsSync(c)) { filePath = c; break; }
    }
    if (!filePath) {
      return res.status(404).json({ error: "File not found" });
    }
    const waveform = await generateWaveform(filePath);
    res.json(waveform);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
