import dotenv from "dotenv";
dotenv.config();

import path from "path";
import fs from "fs";
import express from "express";
import mp3Router from "./routes/mp3";
import { generateWaveform } from "./waveform";

const app = express();

app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

app.use("/mp3", mp3Router);

// Local sample MP3s (for demo without Dropbox)
app.get("/samples", (_req, res) => {
  const samplesDir = path.join(process.cwd(), "public", "samples");
  try {
    const files = fs.readdirSync(samplesDir).filter(f => f.endsWith(".mp3"));
    const samples = files.map(name => {
      const stat = fs.statSync(path.join(samplesDir, name));
      return { name, path: `/samples/${name}`, size: stat.size };
    });
    res.json({ files: samples });
  } catch {
    res.json({ files: [] });
  }
});

// Waveform data for local samples
app.get("/samples/waveform/:filename", async (req, res) => {
  try {
    const filePath = path.join(process.cwd(), "public", "samples", req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    const waveform = await generateWaveform(filePath);
    res.json(waveform);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
