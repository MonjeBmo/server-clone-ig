// server/controllers/comentarios.controller.js
import { pool } from "../Config/db.js";

/** Transforma una fila de DB al modelo esperado por el front */
function rowToComment(r) {
  return {
    id: r.id,
    postId: r.post_id,
    text: r.texto,
    createdAt: r.fecha_comentario,
    user: {
      id: r.usuario_id,
      username: r.username,
      avatar: r.avatar_url || "https://i.pravatar.cc/150?img=12",
    },
  };
}

/** GET /api/posts/:postId/comments - Listar comentarios de un post */
export async function listComments(req, res) {
  try {
    const postId = parseInt(req.params.postId, 10);
    if (!postId) return res.status(400).json({ ok: false, error: "Post ID inválido" });

    const page = Math.max(parseInt(req.query.page ?? "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? "50", 10), 1), 100);
    const offset = (page - 1) * limit;

    // Total de comentarios
    const totalSql = `
      SELECT COUNT(*)::int AS total
      FROM comentarios
      WHERE post_id = $1;
    `;
    const { rows: totalRows } = await pool.query(totalSql, [postId]);
    const total = totalRows[0]?.total ?? 0;

    // Comentarios con datos del usuario
    const dataSql = `
      SELECT 
        c.id, c.post_id, c.usuario_id, c.texto, c.fecha_comentario,
        u.username, u.avatar_url
      FROM comentarios c
      JOIN usuarios u ON u.id = c.usuario_id
      WHERE c.post_id = $1
      ORDER BY c.fecha_comentario ASC
      LIMIT $2 OFFSET $3;
    `;
    const { rows } = await pool.query(dataSql, [postId, limit, offset]);

    return res.json({
      ok: true,
      page,
      limit,
      total,
      items: rows.map(rowToComment),
    });
  } catch (e) {
    console.error("listComments error:", e);
    return res.status(500).json({ ok: false, error: "Error obteniendo comentarios" });
  }
}

/** POST /api/posts/:postId/comments - Crear comentario */
export async function createComment(req, res) {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ ok: false, error: "No autorizado" });

    const postId = parseInt(req.params.postId, 10);
    if (!postId) return res.status(400).json({ ok: false, error: "Post ID inválido" });

    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ ok: false, error: "El comentario no puede estar vacío" });
    }

    if (text.trim().length > 2200) {
      return res.status(400).json({ ok: false, error: "El comentario es demasiado largo (máx 2200 caracteres)" });
    }

    // Verificar que el post existe
    const postCheck = await pool.query(`SELECT id FROM posts WHERE id=$1 AND estado=true`, [postId]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Post no encontrado" });
    }

    // Crear comentario y actualizar contador en transacción
    await pool.query('BEGIN');
    try {
      const { rows } = await pool.query(
        `INSERT INTO comentarios (post_id, usuario_id, texto)
         VALUES ($1, $2, $3)
         RETURNING id, post_id, usuario_id, texto, fecha_comentario`,
        [postId, usuarioId, text.trim()]
      );

      await pool.query(
        `UPDATE posts SET comentarios_count = comentarios_count + 1 WHERE id=$1`,
        [postId]
      );

      await pool.query('COMMIT');

      // Obtener datos del usuario para la respuesta
      const userQuery = await pool.query(
        `SELECT username, avatar_url FROM usuarios WHERE id=$1`,
        [usuarioId]
      );

      const comment = {
        id: rows[0].id,
        postId: rows[0].post_id,
        text: rows[0].texto,
        createdAt: rows[0].fecha_comentario,
        user: {
          id: usuarioId,
          username: userQuery.rows[0]?.username || "user",
          avatar: userQuery.rows[0]?.avatar_url || "https://i.pravatar.cc/150?img=12",
        },
      };

      return res.json({ ok: true, comment });
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    }
  } catch (e) {
    console.error("createComment error:", e);
    return res.status(500).json({ ok: false, error: "Error al crear comentario" });
  }
}

/** DELETE /api/comments/:commentId - Eliminar comentario */
export async function deleteComment(req, res) {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ ok: false, error: "No autorizado" });

    const commentId = parseInt(req.params.commentId, 10);
    if (!commentId) return res.status(400).json({ ok: false, error: "Comentario ID inválido" });

    // Verificar que el comentario existe y pertenece al usuario
    const commentCheck = await pool.query(
      `SELECT post_id FROM comentarios WHERE id=$1 AND usuario_id=$2`,
      [commentId, usuarioId]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Comentario no encontrado o no tienes permiso" });
    }

    const postId = commentCheck.rows[0].post_id;

    // Eliminar comentario y actualizar contador
    await pool.query('BEGIN');
    try {
      await pool.query(`DELETE FROM comentarios WHERE id=$1`, [commentId]);
      await pool.query(
        `UPDATE posts SET comentarios_count = GREATEST(comentarios_count - 1, 0) WHERE id=$1`,
        [postId]
      );
      await pool.query('COMMIT');

      return res.json({ ok: true, message: "Comentario eliminado" });
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    }
  } catch (e) {
    console.error("deleteComment error:", e);
    return res.status(500).json({ ok: false, error: "Error al eliminar comentario" });
  }
}
