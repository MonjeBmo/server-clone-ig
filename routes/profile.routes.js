// server/routes/profile.routes.js
import { Router } from "express";
import {
  getMyProfile,
  getProfileByUsername,
  updateMyProfile,
  followUser,
  unfollowUser,
} from "../controllers/profile.controller.js";
import { requireAuth, optionalAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/me", requireAuth, getMyProfile);
router.put("/me", requireAuth, updateMyProfile);

// Perfil público por username (viewer opcional para saber si lo sigue)
router.get("/:username", optionalAuth, getProfileByUsername);

// Seguir / dejar de seguir por ID de usuario
router.post("/:id/follow", requireAuth, followUser);
router.delete("/:id/follow", requireAuth, unfollowUser);

export default router;
