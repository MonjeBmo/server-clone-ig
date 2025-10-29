// server/utils/file.util.js
import { v4 as uuid } from "uuid";
import mime from "mime-types";

export function buildS3Key({ prefix = "posts", contentType }) {
  const ext = mime.extension(contentType) || "bin";
  // ejemplo: posts/2025/10/29/uuid.ext
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${prefix}/${y}/${m}/${d}/${uuid()}.${ext}`;
}

export function tipoMedia(mimetype) {
  return mimetype?.startsWith("video/") ? "video" : "imagen";
}
