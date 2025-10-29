// server/routes/mensajes.routes.js
import { Router } from "express";
import { 
  listConversations, 
  getMessages, 
  sendMessage, 
  deleteMessage 
} from "../controllers/mensajes.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Todas las rutas requieren autenticación
router.get("/conversations", requireAuth, listConversations);
router.get("/:userId", requireAuth, getMessages);
router.post("/:userId", requireAuth, sendMessage);
router.delete("/:messageId", requireAuth, deleteMessage);

export default router;
