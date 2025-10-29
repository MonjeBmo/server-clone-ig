// server/services/auth.service.js
import { UsuarioModel } from "../models/usuario.model.js";
import { hashPassword, comparePassword } from "../utils/bcrypt.util.js";
import { generarToken } from "../utils/jwt.util.js";

export const AuthService = {
  async registrar(datos) {
    const existente = await UsuarioModel.buscarPorEmail(datos.email);
    if (existente) throw new Error("El email ya está registrado");

    const password_hash = await hashPassword(datos.password);
    const usuario = await UsuarioModel.crear({
      ...datos,
      password_hash,
      proveedor_login: "local",
    });

    const token = generarToken(usuario);
    return { usuario, token };
  },

  async login(email, password) {
    const usuario = await UsuarioModel.buscarPorEmail(email);
    if (!usuario) throw new Error("Usuario no encontrado");

    const valido = await comparePassword(password, usuario.password_hash);
    if (!valido) throw new Error("Contraseña incorrecta");

    const token = generarToken(usuario);
    return { usuario, token };
  },

  async loginGoogle({ email, nombre_completo, avatar_url }) {
    let usuario = await UsuarioModel.buscarPorEmail(email);
    if (!usuario) {
      usuario = await UsuarioModel.crear({
        username: email.split("@")[0],
        nombre_completo,
        email,
        password_hash: "GOOGLE_AUTH",
        avatar_url,
        proveedor_login: "google",
      });
    }
    const token = generarToken(usuario);
    return { usuario, token };
  },
};
