import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { r2Configured, r2SignedGetUrl } from "@/lib/r2";

/** Serves stored images by redirecting to a short-lived presigned R2 URL. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ key: string[] }> }
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!r2Configured()) return new Response("Storage not configured", { status: 404 });

  const { key } = await ctx.params;
  const objectKey = key.join("/");
  if (!/^[a-zA-Z0-9._/-]+$/.test(objectKey)) {
    return new Response("Bad request", { status: 400 });
  }
  redirect(await r2SignedGetUrl(objectKey));
}
