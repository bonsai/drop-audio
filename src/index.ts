import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mp3Router from "./routes/mp3";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json());

app.use("/mp3", mp3Router);

app.get("/", (_req, res) => {
  res.json({
    message: "Drop-in MP3 server",
    endpoints: {
      list: "GET /mp3",
      download: "GET /mp3/download/:filename",
      upload: "POST /mp3/upload (multipart/form-data, field: 'file')",
    },
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`MP3 folder: ${process.env.MP3_FOLDER || "/mp3"}`);
});

export default app;
