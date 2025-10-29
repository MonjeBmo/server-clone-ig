// server/routes/comentarios.routes.js
import { Router } from "express";
import { 
  listComments, 
  createComment, 
  deleteComment 
} from "../controllers/comentarios.controller.js";
import { requireAuth, optionalAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Listar comentarios de un post (público)
router.get("/posts/:postId/comments", optionalAuth, listComments);

// Crear comentario (requiere autenticación)
router.post("/posts/:postId/comments", requireAuth, createComment);

// Eliminar comentario (solo el autor)
router.delete("/comments/:commentId", requireAuth, deleteComment);

export default router;
