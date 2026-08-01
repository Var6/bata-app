import { r2Configured, r2Put } from "@/lib/r2";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Uploads an image from a form field to R2 and returns the object key.
 * Returns undefined when no file was provided or storage is not configured.
 * Only call from authenticated server code.
 */
export async function uploadImage(file: unknown, folder: string): Promise<string | undefined> {
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!r2Configured()) return undefined; // storage optional — skip silently
  if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Images must be under 5 MB.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const key = `${folder}/${crypto.randomUUID()}-${safeName}`;
  await r2Put(key, new Uint8Array(await file.arrayBuffer()), file.type);
  return key;
}
