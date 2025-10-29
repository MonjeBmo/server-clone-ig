// server/routes/search.routes.js
import { Router } from "express";
import { optionalAuth } from "../middleware/auth.middleware.js";
import { searchAll, searchUsers, searchPosts } from "../controllers/search.controller.js";

const router = Router();

// no requieren login; si hay token, optionalAuth lo ignora/acepta
router.get("/all", optionalAuth, searchAll);
router.get("/users", optionalAuth, searchUsers);
router.get("/posts", optionalAuth, searchPosts);

export default router;
