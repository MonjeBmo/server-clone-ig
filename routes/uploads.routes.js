import { Router } from "express";
import { s3SignedGetUrl } from "../utils/s3.util.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const r = Router();

// GET /api/uploads/signed-url?key=posts/2025/10/29/uuid.jpg
r.get("/signed-url", requireAuth, async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ ok: false, error: "key requerida" });
    const url = await s3SignedGetUrl(String(key), 60); // 60 seg
    res.json({ ok: true, url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "signed_failed" });
  }
});

export default r;
