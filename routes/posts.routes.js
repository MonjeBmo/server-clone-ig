// server/routes/posts.routes.js
import { Router } from "express";
import { 
  createPosts, 
  listFeed, 
  listMyPosts, 
  listUserPosts,
  listSavedPosts,
  likePost,
  unlikePost,
  savePost,
  unsavePost
} from "../controllers/posts.controller.js";
import { uploadPosts } from "../utils/upload.util.js";
import { requireAuth, optionalAuth } from "../middleware/auth.middleware.js"; // usa el que ya tienes

const router = Router();

// Enviar múltiples archivos con el campo "media"
router.post("/", requireAuth, uploadPosts.array("media", 10), createPosts);

// Feed público + propio (no requiere token, pero si lo hay, va en req.user)
router.get("/", optionalAuth, listFeed);

// Mis posts
router.get("/me", requireAuth, listMyPosts);

// Posts guardados
router.get("/saved", requireAuth, listSavedPosts);

// Posts de un usuario específico
router.get("/user/:id", optionalAuth, listUserPosts);

// Likes
router.post("/:postId/like", requireAuth, likePost);
router.delete("/:postId/like", requireAuth, unlikePost);

// Guardados
router.post("/:postId/save", requireAuth, savePost);
router.delete("/:postId/save", requireAuth, unsavePost);

export default router;
