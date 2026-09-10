import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { resolveMediaPath } from "@/server/storage";

const CONTENT_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const absolutePath = resolveMediaPath(segments);
  if (!absolutePath) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ext = absolutePath.slice(absolutePath.lastIndexOf(".")).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

  const data = await readFile(absolutePath);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
