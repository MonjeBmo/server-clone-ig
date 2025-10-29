import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", AuthController.registrar);
router.post("/login", AuthController.login);
router.post("/login-google", AuthController.loginGoogle);

export default router;
