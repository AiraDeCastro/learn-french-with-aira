import type { UploadKind } from "@/server/storage";

export async function uploadFile(kind: UploadKind, file: File): Promise<string> {
  const formData = new FormData();
  formData.set("kind", kind);
  formData.set("file", file);

  const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Upload failed (${res.status})`);
  }

  const { url } = (await res.json()) as { url: string };
  return url;
}
