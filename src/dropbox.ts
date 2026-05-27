import { Dropbox } from "dropbox";

export const AUDIO_EXTENSIONS = [
  ".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a",
  ".wma", ".opus", ".aiff", ".alac",
];

function isAudioFile(name: string): boolean {
  const lower = name.toLowerCase();
  return AUDIO_EXTENSIONS.some(ext => lower.endsWith(ext));
}

let dbx: Dropbox | null = null;

export function isDropboxAvailable(): boolean {
  return !!process.env.DROPBOX_ACCESS_TOKEN;
}

export function getDropboxClient(): Dropbox {
  if (dbx) return dbx;

  const accessToken = process.env.DROPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error(
      "DROPBOX_ACCESS_TOKEN is not set in environment variables"
    );
  }

  dbx = new Dropbox({ accessToken });
  return dbx;
}

export interface Mp3Entry {
  name: string;
  path: string;
  size: number;
  modified: Date;
}

export async function listMp3s(folderPath: string): Promise<Mp3Entry[]> {
  const client = getDropboxClient();
  const entries: Mp3Entry[] = [];

  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = cursor
      ? await client.filesListFolderContinue({ cursor })
      : await client.filesListFolder({ path: folderPath });

    for (const entry of response.result.entries) {
      if (entry[".tag"] === "file" && isAudioFile(entry.name)) {
        entries.push({
          name: entry.name,
          path: entry.path_display ?? entry.path_lower ?? "",
          size: entry.size,
          modified: new Date(entry.server_modified ?? entry.client_modified ?? ""),
        });
      }
    }

    hasMore = response.result.has_more;
    cursor = response.result.cursor;
  }

  return entries;
}

export async function downloadMp3(filePath: string): Promise<{
  buffer: Buffer;
  name: string;
  mimeType: string;
}> {
  const client = getDropboxClient();
  const response = await client.filesDownload({ path: filePath });

  const result = response.result as any;
  const fileBinary = result.fileBinary as Buffer;

  return {
    buffer: fileBinary,
    name: result.name,
    mimeType: "audio/mpeg",
  };
}

export async function uploadMp3(
  folderPath: string,
  fileName: string,
  contents: Buffer
): Promise<{ name: string; path: string; size: number }> {
  const client = getDropboxClient();
  const dropboxPath = `${folderPath}/${fileName}`;

  const response = await client.filesUpload({
    path: dropboxPath,
    contents,
    mode: { ".tag": "add" },
    autorename: true,
  });

  return {
    name: response.result.name,
    path: response.result.path_display ?? response.result.path_lower ?? "",
    size: response.result.size,
  };
}
