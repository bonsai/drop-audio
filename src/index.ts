import app from "./app";

const PORT = parseInt(process.env.PORT || "3000", 10);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`MP3 folder: ${process.env.MP3_FOLDER || "/"}`);
});
