// server/middleware/auth.middleware.js
import jwt from "jsonwebtoken";

/** Usamos el MISMO secreto que en jwt.utils.js (sin .env) */
const SECRET = "secreto_muy_largo_para_producion";

/**
 * Extrae el Bearer token del header Authorization
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function getTokenFromHeader(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || "";
  if (typeof h !== "string") return null;
  return h.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

/**
 * Middleware: requiere token válido
 * - Verifica JWT
 * - Coloca req.user = { id, email, username, raw: payload }
 */
export function requireAuth(req, res, next) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ ok: false, error: "No autorizado (falta token)" });
    }

    let payload;
    try {
      payload = jwt.verify(token, SECRET); // { sub, email, username, iat, exp, ... }
    } catch (err) {
      // Mensajes claros según el tipo de error
      if (err?.name === "TokenExpiredError") {
        return res.status(401).json({ ok: false, error: "Token expirado" });
      }
      return res.status(401).json({ ok: false, error: "Token inválido" });
    }

    const userId = payload?.sub || payload?.id || payload?.user?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "Token sin identificador de usuario" });
    }

    // Lo mínimo que tu app necesita
    req.user = {
      id: userId,
      email: payload?.email,
      username: payload?.username,
      raw: payload, // por si en el futuro quieres claims adicionales
    };

    return next();
  } catch (e) {
    console.error("requireAuth error:", e);
    return res.status(401).json({ ok: false, error: "No autorizado" });
  }
}

/**
 * Middleware opcional: NO falla si no hay token.
 * - Si hay token válido, setea req.user.
 * - Si no, sigue como anónimo.
 */
export function optionalAuth(req, _res, next) {
  const token = getTokenFromHeader(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, SECRET);
    const userId = payload?.sub || payload?.id || payload?.user?.id;
    if (userId) {
      req.user = {
        id: userId,
        email: payload?.email,
        username: payload?.username,
        raw: payload,
      };
    }
  } catch {
    // ignoramos errores para uso opcional
  }
  return next();
}
