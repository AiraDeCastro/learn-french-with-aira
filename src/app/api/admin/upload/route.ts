import { NextResponse } from "next/server";
import { saveUpload, type UploadKind } from "@/server/storage";

const VALID_KINDS: UploadKind[] = ["audio", "cover", "transcript"];

/**
 * Plain multipart upload endpoint, kept outside tRPC because tRPC's JSON
 * transport isn't a good fit for binary file bodies. The admin panel posts
 * here first, then sends the returned URL through the normal `lesson`
 * tRPC procedures alongside the rest of the form.
 *
 * No auth gate yet — see TASKS.md M1 follow-up: lock this (and the rest of
 * /admin) behind an authenticated admin role before this ships anywhere
 * public.
 */
export async function POST(req: Request) {
  const formData = await req.formData();
  const kind = formData.get("kind");
  const file = formData.get("file");

  if (typeof kind !== "string" || !VALID_KINDS.includes(kind as UploadKind)) {
    return NextResponse.json({ error: "Invalid or missing 'kind'" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file'" }, { status: 400 });
  }

  const result = await saveUpload(kind as UploadKind, file);
  return NextResponse.json(result);
}
