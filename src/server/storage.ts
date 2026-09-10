import { mkdir, writeFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Local-disk media storage for lesson audio/transcripts/cover art.
 *
 * This is a stand-in for Cloudflare R2 (PLANNING.md §3) — R2 needs a
 * Cloudflare account that only Aira can create. Everything here is written
 * so swapping the backend later means changing this file, not every call
 * site: callers only ever see `saveUpload()` and the `/api/media/...` URL
 * it returns, never a filesystem path.
 */

const STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");

export type UploadKind = "audio" | "cover" | "transcript";

function extensionFor(filename: string): string {
  const ext = path.extname(filename);
  return ext || "";
}

export async function saveUpload(
  kind: UploadKind,
  file: File,
): Promise<{ url: string; path: string }> {
  const dir = path.join(STORAGE_ROOT, kind);
  await mkdir(dir, { recursive: true });

  const safeName = `${randomUUID()}${extensionFor(file.name)}`;
  const absolutePath = path.join(dir, safeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  const relativePath = `${kind}/${safeName}`;
  return { url: `/api/media/${relativePath}`, path: relativePath };
}

export function resolveMediaPath(relativeSegments: string[]): string | null {
  const relativePath = path.join(...relativeSegments);
  const absolutePath = path.join(STORAGE_ROOT, relativePath);

  // Guard against path traversal escaping STORAGE_ROOT.
  if (!absolutePath.startsWith(STORAGE_ROOT)) return null;
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) return null;

  return absolutePath;
}
