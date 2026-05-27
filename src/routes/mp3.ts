import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { isDropboxAvailable, listMp3s, downloadMp3, uploadMp3, AUDIO_EXTENSIONS, TEXT_EXTENSIONS } from "../dropbox";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB (Vercel hobby limit is 4.5MB)
});

function getMp3Folder(): string {
  return process.env.MP3_FOLDER || "/";
}

// GET /mp3 — list all MP3 files
router.get("/", async (_req: Request, res: Response) => {
  if (!isDropboxAvailable()) {
    return res.json({ files: [], note: "Dropbox not configured. Set DROPBOX_ACCESS_TOKEN to enable." });
  }
  try {
    const folder = getMp3Folder();
    const files = await listMp3s(folder);
    res.json({ files });
  } catch (err: any) {
    console.error("Failed to list MP3s:", err);
    if (err.status === 409) {
      return res.json({ files: [], note: `Folder "${getMp3Folder()}" not found in Dropbox.` });
    }
    if (err.status === 400 && err.error?.includes?.("scope")) {
      return res.status(400).json({ error: "Dropbox token missing required scopes (files.metadata.read)." });
    }
    if (err.status === 401) {
      return res.json({ files: [], note: "Dropbox token expired or invalid. Regenerate in App Console." });
    }
    res.status(500).json({ error: err.message || "Failed to list MP3s" });
  }
});

// GET /mp3/download/:filename — download/stream an MP3 file (range request supported)
router.get("/download/:filename", async (req: Request, res: Response) => {
  if (!isDropboxAvailable()) {
    return res.status(503).json({ error: "Dropbox not configured" });
  }
  try {
    const folder = getMp3Folder();
    const filePath = `${folder}/${req.params.filename}`;
    const { buffer, name } = await downloadMp3(filePath);

    const totalSize = buffer.length;
    const rangeHeader = req.headers.range;

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;
        const chunkSize = end - start + 1;

        res.status(206);
        res.set({
          "Content-Type": "audio/mpeg",
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Content-Length": chunkSize.toString(),
          "Accept-Ranges": "bytes",
        });
        return res.send(buffer.subarray(start, end + 1));
      }
    }

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Disposition": `inline; filename="${name}"`,
      "Content-Length": totalSize.toString(),
      "Accept-Ranges": "bytes",
    });
    res.send(buffer);
  } catch (err: any) {
    console.error("Failed to download MP3:", err);

    if (err.status === 409) {
      return res.status(404).json({ error: "File not found in Dropbox." });
    }
    if (err.status === 400 && err.error?.includes?.("scope")) {
      return res.status(400).json({ error: "Dropbox token missing required scopes (files.content.read)." });
    }
    res.status(500).json({ error: err.message || "Failed to download MP3" });
  }
});

function isAllowedFile(name: string): boolean {
  const lower = name.toLowerCase();
  return [...AUDIO_EXTENSIONS, ...TEXT_EXTENSIONS].some(ext => lower.endsWith(ext));
}

// POST /mp3/upload — upload an audio file
router.post(
  "/upload",
  (req: Request, res: Response, next) => {
    upload.single("file")(req, res, (err: any) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "File too large. Max 4MB (Vercel hobby plan limit)." });
        }
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    if (!isDropboxAvailable()) {
      return res.status(503).json({ error: "Dropbox not configured" });
    }
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      if (!isAllowedFile(req.file.originalname)) {
        return res.status(400).json({
          error: `Unsupported file type. Allowed: ${[...AUDIO_EXTENSIONS, ...TEXT_EXTENSIONS].join(", ")}`,
        });
      }

      // Save locally in public/uploads/
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      fs.mkdirSync(uploadsDir, { recursive: true });
      const localPath = path.join(uploadsDir, req.file.originalname);
      fs.writeFileSync(localPath, req.file.buffer);

      // Upload to Dropbox
      const folder = getMp3Folder();
      const dropboxResult = await uploadMp3(folder, req.file.originalname, req.file.buffer);

      res.status(201).json({
        message: "Upload successful",
        file: dropboxResult,
        local: `/uploads/${encodeURIComponent(req.file.originalname)}`,
      });
    } catch (err: any) {
      console.error("Failed to upload:", err);
      if (err.status === 409) {
        return res.status(404).json({ error: `Folder "${getMp3Folder()}" not found in Dropbox.` });
      }
      if (err.status === 400 && err.error?.includes?.("scope")) {
        return res.status(400).json({ error: "Dropbox token missing required scopes (files.content.write)." });
      }
      res.status(500).json({ error: err.message || "Failed to upload" });
    }
  }
);

export default router;
