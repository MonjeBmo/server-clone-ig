import jwt from "jsonwebtoken";
import { env } from "../Config/env.js";

export const generarToken = (usuario) => {
  return jwt.sign(
    { sub: usuario.id, email: usuario.email, username: usuario.username },
    "secreto_muy_largo_para_producion", // env.jwtSecret --- IGNORE ---
    { expiresIn: "7d" }
  );
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, "secreto_muy_largo_para_producion");
  } catch (error) {
    throw new Error("Token inválido o expirado");
  }
};
