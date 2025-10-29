// server/utils/s3.util.js
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET;
const PUBLIC_BASE = process.env.S3_PUBLIC_BASE || "";
export const s3 = new S3Client({ region: REGION });

export async function s3PutObject({ key, body, contentType }) {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType
    // ACL: "public-read" // ⚠️ no recomendado; usa CloudFront/OAC o GET firmado
  });
  await s3.send(cmd);
  return key;
}

export function s3PublicUrl(key) {
  if (!PUBLIC_BASE) return null;
  return `${PUBLIC_BASE}/${key}`;
}

export async function s3SignedGetUrl(key, expiresIn = 60) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn });
}
