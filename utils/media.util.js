// server/utils/media.util.js
import { s3SignedGetUrl } from "./../utils/s3.util.js";

export function isHttpUrl(v = "") {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}
export function isS3Key(v = "") {
  return typeof v === "string" && !isHttpUrl(v) && !v.startsWith("/uploads/");
}

export async function resolveMediaUrl(value) {
  if (!value) return null;
  if (isHttpUrl(value)) return value;           // ya es URL (S3 público / CloudFront)
  if (isS3Key(value)) return await s3SignedGetUrl(value, 300); // 5 min
  // Legacy local: "/uploads/..." -> ya no existe, devuelve null para que no rompa la UI
  return null;
}
