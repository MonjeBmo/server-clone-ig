import axios from "axios";
import { OAuth2Client } from "google-auth-library";
import { AuthService } from "../services/auth.service.js";
import { UsuarioModel } from "../models/usuario.model.js";
import { env } from "../Config/env.js";

const googleClient = new OAuth2Client("930498283653-gu4led0tqru6m47dtbmo19ev8cjih5qh.apps.googleusercontent.com");

async function verificarCaptcha(captchaToken, req) {
  if (!captchaToken) throw new Error("Captcha no enviado");

  const params = new URLSearchParams();
  params.append("secret", env.recaptchaSecret);      // ← secret de v2 Invisible
  params.append("response", captchaToken);
  // opcional: IP del usuario (ayuda en diagnósticos)
  if (req.ip) params.append("remoteip", req.ip);

  const { data } = await axios.post(
    "https://www.google.com/recaptcha/api/siteverify",
    params,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  // Debug útil:
  console.log("captcha success:", data.success, "hostname:", data.hostname, "ts:", data.challenge_ts);

  if (!data.success) {
    const codes = data["error-codes"] || [];
    if (codes.includes("timeout-or-duplicate")) {
      throw new Error("El captcha ya fue usado. Por favor, intenta de nuevo.");
    }
    if (codes.includes("invalid-input-response")) {
      throw new Error("Token de captcha inválido. Por favor, recarga la página.");
    }
    throw new Error("Captcha inválido: " + codes.join(", "));
  }

  // (opcional) valida que el hostname devuelto sea tu dominio/localhost
  // if (data.hostname !== "localhost" && data.hostname !== "app.midominio.com") { ... }

  return data;
}



export const AuthController = {
  async registrar(req, res) {
    try {
      const { captcha, ...payload } = req.body;
      await verificarCaptcha(captcha ,req);

      const { usuario, token } = await AuthService.registrar(payload);
      await UsuarioModel.actualizarUltimoLogin(usuario.id);
      await UsuarioModel.registrarSesionLogin({
        usuario_id: usuario.id,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
        exito: true,
        proveedor: "local",
      });

      res.status(201).json({ ok: true, usuario, token });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  },

  async login(req, res) {
    try {
      const { email, password, captcha } = req.body;
      await verificarCaptcha(captcha, req);

      const { usuario, token } = await AuthService.login(email, password);
      await UsuarioModel.actualizarUltimoLogin(usuario.id);
      await UsuarioModel.registrarSesionLogin({
        usuario_id: usuario.id,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
        exito: true,
        proveedor: "local",
      });

      res.json({ ok: true, usuario, token });
    } catch (err) {
      // registrar intento fallido si email existe
      try {
        const u = await UsuarioModel.buscarPorEmail(req.body?.email || null);
        if (u) {
          await UsuarioModel.registrarSesionLogin({
            usuario_id: u.id,
            ip_address: req.ip,
            user_agent: req.headers["user-agent"],
            exito: false,
            proveedor: "local",
          });
        }
      } catch {}
      res.status(400).json({ ok: false, error: err.message });
    }
  },

  async loginGoogle(req, res) {
    try {
      const { tokenGoogle, captcha } = req.body;

      // 1) reCAPTCHA
      await verificarCaptcha(captcha, req);

      // 2) Verificar ID token de Google (audience = tu clientId)
      const ticket = await googleClient.verifyIdToken({
        idToken: tokenGoogle,
        audience: "930498283653-gu4led0tqru6m47dtbmo19ev8cjih5qh.apps.googleusercontent.com",
      });
      const payload = ticket.getPayload();
      const { email, name, picture } = payload;

      // 3) Login/alta
      const { usuario, token } = await AuthService.loginGoogle({
        email,
        nombre_completo: name,
        avatar_url: picture,
      });

      await UsuarioModel.actualizarUltimoLogin(usuario.id);
      await UsuarioModel.registrarSesionLogin({
        usuario_id: usuario.id,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
        exito: true,
        proveedor: "google",
      });

      res.json({ ok: true, usuario, token });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  },
};
