import { Router, Request, Response } from "express";
import multer from "multer";
import { listMp3s, downloadMp3, uploadMp3 } from "../dropbox";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

function getMp3Folder(): string {
  return process.env.MP3_FOLDER || "/mp3";
}

// GET /mp3 — list all MP3 files
router.get("/", async (_req: Request, res: Response) => {
  try {
    const folder = getMp3Folder();
    const files = await listMp3s(folder);
    res.json({ files });
  } catch (err: any) {
    console.error("Failed to list MP3s:", err);
    res.status(500).json({ error: err.message || "Failed to list MP3s" });
  }
});

// GET /mp3/download/:filename — download an MP3 file
router.get("/download/:filename", async (req: Request, res: Response) => {
  try {
    const folder = getMp3Folder();
    const filePath = `${folder}/${req.params.filename}`;
    const { buffer, name } = await downloadMp3(filePath);

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Content-Length": buffer.length.toString(),
    });
    res.send(buffer);
  } catch (err: any) {
    console.error("Failed to download MP3:", err);

    if (err.status === 409) {
      return res.status(404).json({ error: "File not found" });
    }
    res.status(500).json({ error: err.message || "Failed to download MP3" });
  }
});

// POST /mp3/upload — upload an MP3 file
router.post(
  "/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      if (!req.file.originalname.toLowerCase().endsWith(".mp3")) {
        return res.status(400).json({ error: "Only MP3 files are allowed" });
      }

      const folder = getMp3Folder();
      const result = await uploadMp3(folder, req.file.originalname, req.file.buffer);

      res.status(201).json({
        message: "Upload successful",
        file: result,
      });
    } catch (err: any) {
      console.error("Failed to upload MP3:", err);
      res.status(500).json({ error: err.message || "Failed to upload MP3" });
    }
  }
);

export default router;
