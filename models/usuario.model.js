// server/models/usuario.model.js
import { pool } from "../Config/db.js";

export const UsuarioModel = {
  async buscarPorEmail(email) {
    const { rows } = await pool.query(
      `SELECT * FROM usuarios WHERE email=$1 LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  async crear({
    username,
    nombre_completo,
    email,
    password_hash,
    biografia = null,
    avatar_url = null,
    sitio_web = null,
    proveedor_login = "local",
  }) {
    const { rows } = await pool.query(
      `INSERT INTO usuarios
       (username, nombre_completo, email, password_hash, biografia, avatar_url, sitio_web, proveedor_login)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [username, nombre_completo, email, password_hash, biografia, avatar_url, sitio_web, proveedor_login]
    );
    return rows[0];
  },

  async actualizarUltimoLogin(id) {
    await pool.query(`UPDATE usuarios SET ultimo_login=now() WHERE id=$1`, [id]);
  },

  async registrarSesionLogin({ usuario_id, ip_address, user_agent, exito = true, proveedor = "local" }) {
    await pool.query(
      `INSERT INTO sesiones_login (usuario_id, ip_address, user_agent, exito, proveedor)
       VALUES ($1,$2,$3,$4,$5)`,
      [usuario_id, ip_address, user_agent, exito, proveedor]
    );
  },
};
