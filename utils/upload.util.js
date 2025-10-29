// server/utils/upload.util.js
import multer from "multer";

const IMAGE_TYPES = ["image/png","image/jpeg","image/jpg","image/webp","image/gif","image/avif","image/heic","image/heif"];
const VIDEO_TYPES = ["video/mp4","video/webm","video/ogg","video/quicktime"];
const ALLOWED = new Set([...IMAGE_TYPES, ...VIDEO_TYPES]);

const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  if (!ALLOWED.has(file.mimetype)) {
    return cb(new Error("Tipo de archivo no permitido"));
  }
  cb(null, true);
}

export const uploadPosts = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (Number(process.env.UPLOAD_MAX_MB || 15)) * 1024 * 1024, // MB
    files: 10,
  }
});
