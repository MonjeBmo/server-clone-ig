// server/controllers/posts.controller.js
import { pool } from "../Config/db.js";
import { s3PutObject, s3PublicUrl } from "../utils/s3.util.js";
import { buildS3Key, tipoMedia } from "../utils/file.util.js";
import { resolveMediaUrl } from "../utils/media.util.js";


export const createPosts = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const { descripcion, location } = req.body; // location no se usa aún, lo puedes guardar si quieres
    const files = req.files || [];

    if (!files.length) {
      return res.status(400).json({ ok: false, error: "No se adjuntaron archivos" });
    }

    const prefix = process.env.S3_PREFIX || "posts";

    const newPosts = await Promise.all(
      files.map(async (file) => {
        const tipo = tipoMedia(file.mimetype);
        const key = buildS3Key({ prefix, contentType: file.mimetype });

        // 1) subir a S3
        await s3PutObject({ key, body: file.buffer, contentType: file.mimetype });

        // 2) URL a guardar (si es público directo). Si bucket privado, guarda `key` y luego usa GET firmado.
        const publicUrl = s3PublicUrl(key); // puede ser null si no configuraste S3_PUBLIC_BASE

        // 3) guardar en DB
        const urlContenido = publicUrl || key; // si privado, guardas key; si público, la URL
        const post = await pool.query(
          `INSERT INTO posts (usuario_id, tipo, url_contenido, descripcion, fecha_publicacion)
           VALUES ($1, $2, $3, $4, now())
           RETURNING *`,
          [usuarioId, tipo, urlContenido, descripcion]
        );
        return post.rows[0];
      })
    );

    return res.json({ ok: true, posts: newPosts });
  } catch (e) {
    console.error("❌ Error creando post:", e);
    res.status(500).json({ ok: false, error: "Error interno al crear el post" });
  }
};

/** Transforma una fila de DB al modelo esperado por el front */
function rowToPost(r, resolvedUrl) {
  return {
    id: r.id,
    caption: r.descripcion || "",
    likesCount: r.likes_count ?? 0,
    commentsCount: r.comentarios_count ?? 0,
    userHasLiked: r.user_has_liked || false,
    userHasSaved: r.user_has_saved || false,
    isLiked: r.user_has_liked || false,
    isSaved: r.user_has_saved || false,
    createdAt: r.fecha_publicacion,
    media: (r.url_contenido || resolvedUrl) ? {
      type: r.tipo === "video" ? "video" : "image",
      url: resolvedUrl || r.url_contenido,
      key: !/^https?:\/\//i.test(r.url_contenido) ? r.url_contenido : undefined, // opcional
    } : null,
    user: {
      id: r.usuario_id,
      username: r.username,
      avatar: r.avatar_url || "https://i.pravatar.cc/150?img=12",
    },
  };
}

/** GET /api/posts  (feed público + propio, paginado, con búsqueda opcional) */
export async function listFeed(req, res) {
  try {
    const userId = req.user?.id; // puede ser null si no está autenticado
    const page  = Math.max(parseInt(req.query.page ?? "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? "20", 10), 1), 50);
    const search = (req.query.search ?? "").trim();

    const offset = (page - 1) * limit;

    const params = [];
    let where = `p.estado = true`;
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (p.descripcion ILIKE $${params.length})`;
    }

    // total
    const totalSql = `
      SELECT COUNT(*)::int AS total
      FROM public.posts p
      WHERE ${where};
    `;
    const { rows: totalRows } = await pool.query(totalSql, params);
    const total = totalRows[0]?.total ?? 0;

    // data con LEFT JOIN para detectar likes y guardados del usuario actual
    params.push(limit, offset);
    if (userId) params.push(userId);
    
    const likeSavedFields = userId 
      ? `EXISTS(SELECT 1 FROM public.likes WHERE post_id = p.id AND usuario_id = $${params.length}) AS user_has_liked,
        EXISTS(SELECT 1 FROM public.guardados WHERE post_id = p.id AND usuario_id = $${params.length}) AS user_has_saved`
      : `false AS user_has_liked,
        false AS user_has_saved`;
    
    const dataSql = `
      SELECT 
        p.id, p.usuario_id, p.tipo, p.url_contenido, p.descripcion,
        p.likes_count, p.comentarios_count, p.fecha_publicacion, p.estado,
        u.username, u.avatar_url,
        ${likeSavedFields}
      FROM public.posts p
      JOIN public.usuarios u ON u.id = p.usuario_id
      WHERE ${where}
      ORDER BY p.fecha_publicacion DESC
      LIMIT $${params.length - (userId ? 1 : 0) - 1} OFFSET $${params.length - (userId ? 1 : 0)};
    `;
    const { rows } = await pool.query(dataSql, params);

    const items = await Promise.all(rows.map(async (r) => {
      const resolved = await resolveMediaUrl(r.url_contenido);
      return rowToPost(r, resolved);
    }));

    return res.json({ ok: true, page, limit, total, items });

  } catch (e) {
    console.error("listFeed error:", e);
    return res.status(500).json({ ok: false, error: "Error obteniendo posts" });
  }
}

/** GET /api/posts/me  (solo mis posts) */
export async function listMyPosts(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ ok: false, error: "No autorizado" });

    const page  = Math.max(parseInt(req.query.page ?? "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? "20", 10), 1), 50);
    const offset = (page - 1) * limit;

    const totalSql = `
      SELECT COUNT(*)::int AS total
      FROM public.posts
      WHERE estado = true AND usuario_id = $1;
    `;
    const { rows: totalRows } = await pool.query(totalSql, [userId]);
    const total = totalRows[0]?.total ?? 0;

    const dataSql = `
      SELECT 
        p.id, p.usuario_id, p.tipo, p.url_contenido, p.descripcion,
        p.likes_count, p.comentarios_count, p.fecha_publicacion, p.estado,
        u.username, u.avatar_url
      FROM public.posts p
      JOIN public.usuarios u ON u.id = p.usuario_id
      WHERE p.estado = true AND p.usuario_id = $1
      ORDER BY p.fecha_publicacion DESC
      LIMIT $2 OFFSET $3;
    `;
    const { rows } = await pool.query(dataSql, [userId, limit, offset]);

    const items = await Promise.all(rows.map(async (r) => {
      const resolved = await resolveMediaUrl(r.url_contenido);
      return rowToPost(r, resolved);
    }));

    return res.json({ ok: true, page, limit, total, items });

  } catch (e) {
    console.error("listMyPosts error:", e);
    return res.status(500).json({ ok: false, error: "Error obteniendo mis posts" });
  }
}

/** GET /api/posts/user/:id  (posts públicos de otro usuario) */
export async function listUserPosts(req, res) {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    if (!targetUserId) return res.status(400).json({ ok: false, error: "Usuario inválido" });

    const page  = Math.max(parseInt(req.query.page ?? "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? "20", 10), 1), 50);
    const offset = (page - 1) * limit;

    const totalSql = `
      SELECT COUNT(*)::int AS total
      FROM public.posts
      WHERE estado = true AND usuario_id = $1;
    `;
    const { rows: totalRows } = await pool.query(totalSql, [targetUserId]);
    const total = totalRows[0]?.total ?? 0;

    const dataSql = `
      SELECT 
        p.id, p.usuario_id, p.tipo, p.url_contenido, p.descripcion,
        p.likes_count, p.comentarios_count, p.fecha_publicacion, p.estado,
        u.username, u.avatar_url
      FROM public.posts p
      JOIN public.usuarios u ON u.id = p.usuario_id
      WHERE p.estado = true AND p.usuario_id = $1
      ORDER BY p.fecha_publicacion DESC
      LIMIT $2 OFFSET $3;
    `;
    const { rows } = await pool.query(dataSql, [targetUserId, limit, offset]);

    const items = await Promise.all(rows.map(async (r) => {
      const resolved = await resolveMediaUrl(r.url_contenido);
      return rowToPost(r, resolved);
    }));

    return res.json({ ok: true, page, limit, total, items });

  } catch (e) {
    console.error("listUserPosts error:", e);
    return res.status(500).json({ ok: false, error: "Error obteniendo posts del usuario" });
  }
}

/** GET /api/posts/saved - Listar posts guardados del usuario autenticado */
export async function listSavedPosts(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ ok: false, error: "No autorizado" });

    const page  = Math.max(parseInt(req.query.page ?? "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? "50", 10), 1), 100);
    const offset = (page - 1) * limit;

    // Total de posts guardados
    const totalSql = `
      SELECT COUNT(*)::int AS total
      FROM guardados g
      JOIN posts p ON p.id = g.post_id
      WHERE g.usuario_id = $1 AND p.estado = true;
    `;
    const { rows: totalRows } = await pool.query(totalSql, [userId]);
    const total = totalRows[0]?.total ?? 0;

    // Posts guardados con datos completos
    const dataSql = `
      SELECT 
        p.id, p.usuario_id, p.tipo, p.url_contenido, p.descripcion,
        p.likes_count, p.comentarios_count, p.fecha_publicacion, p.estado,
        u.username, u.avatar_url,
        true AS user_has_liked,
        true AS user_has_saved
      FROM guardados g
      JOIN posts p ON p.id = g.post_id
      JOIN usuarios u ON u.id = p.usuario_id
      WHERE g.usuario_id = $1 AND p.estado = true
      ORDER BY g.created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const { rows } = await pool.query(dataSql, [userId, limit, offset]);

    const items = await Promise.all(rows.map(async (r) => {
      const resolved = await resolveMediaUrl(r.url_contenido);
      return rowToPost(r, resolved);
    }));

    return res.json({ ok: true, page, limit, total, items });

  } catch (e) {
    console.error("listSavedPosts error:", e);
    return res.status(500).json({ ok: false, error: "Error obteniendo posts guardados" });
  }
}

/** POST /api/posts/:postId/like - Dar like a un post */
export async function likePost(req, res) {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ ok: false, error: "No autorizado" });

    const postId = parseInt(req.params.postId, 10);
    if (!postId) return res.status(400).json({ ok: false, error: "Post ID inválido" });

    // Verificar si el post existe
    const postCheck = await pool.query(`SELECT id FROM posts WHERE id=$1 AND estado=true`, [postId]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Post no encontrado" });
    }

    // Verificar si ya dio like
    const existingLike = await pool.query(
      `SELECT id FROM likes WHERE usuario_id=$1 AND post_id=$2`,
      [usuarioId, postId]
    );

    if (existingLike.rows.length > 0) {
      return res.status(400).json({ ok: false, error: "Ya diste like a este post" });
    }

    // Crear like y actualizar contador en transacción
    await pool.query('BEGIN');
    try {
      await pool.query(
        `INSERT INTO likes (usuario_id, post_id) VALUES ($1, $2)`,
        [usuarioId, postId]
      );
      await pool.query(
        `UPDATE posts SET likes_count = likes_count + 1 WHERE id=$1`,
        [postId]
      );
      await pool.query('COMMIT');

      // Obtener nuevo contador
      const { rows } = await pool.query(`SELECT likes_count FROM posts WHERE id=$1`, [postId]);
      return res.json({ ok: true, likes: rows[0]?.likes_count ?? 0 });
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    }
  } catch (e) {
    console.error("likePost error:", e);
    return res.status(500).json({ ok: false, error: "Error al dar like" });
  }
}

/** DELETE /api/posts/:postId/like - Quitar like de un post */
export async function unlikePost(req, res) {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ ok: false, error: "No autorizado" });

    const postId = parseInt(req.params.postId, 10);
    if (!postId) return res.status(400).json({ ok: false, error: "Post ID inválido" });

    // Verificar si existe el like
    const existingLike = await pool.query(
      `SELECT id FROM likes WHERE usuario_id=$1 AND post_id=$2`,
      [usuarioId, postId]
    );

    if (existingLike.rows.length === 0) {
      return res.status(400).json({ ok: false, error: "No has dado like a este post" });
    }

    // Eliminar like y actualizar contador
    await pool.query('BEGIN');
    try {
      await pool.query(
        `DELETE FROM likes WHERE usuario_id=$1 AND post_id=$2`,
        [usuarioId, postId]
      );
      await pool.query(
        `UPDATE posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id=$1`,
        [postId]
      );
      await pool.query('COMMIT');

      // Obtener nuevo contador
      const { rows } = await pool.query(`SELECT likes_count FROM posts WHERE id=$1`, [postId]);
      return res.json({ ok: true, likes: rows[0]?.likes_count ?? 0 });
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    }
  } catch (e) {
    console.error("unlikePost error:", e);
    return res.status(500).json({ ok: false, error: "Error al quitar like" });
  }
}

/** POST /api/posts/:postId/save - Guardar post */
export async function savePost(req, res) {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ ok: false, error: "No autorizado" });

    const postId = parseInt(req.params.postId, 10);
    if (!postId) return res.status(400).json({ ok: false, error: "Post ID inválido" });

    // Verificar si ya está guardado
    const existingSave = await pool.query(
      `SELECT id FROM guardados WHERE usuario_id=$1 AND post_id=$2`,
      [usuarioId, postId]
    );

    if (existingSave.rows.length > 0) {
      return res.status(400).json({ ok: false, error: "Ya guardaste este post" });
    }

    await pool.query(
      `INSERT INTO guardados (usuario_id, post_id) VALUES ($1, $2)`,
      [usuarioId, postId]
    );

    return res.json({ ok: true, message: "Post guardado" });
  } catch (e) {
    console.error("savePost error:", e);
    return res.status(500).json({ ok: false, error: "Error al guardar post" });
  }
}

/** DELETE /api/posts/:postId/save - Dejar de guardar post */
export async function unsavePost(req, res) {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ ok: false, error: "No autorizado" });

    const postId = parseInt(req.params.postId, 10);
    if (!postId) return res.status(400).json({ ok: false, error: "Post ID inválido" });

    const result = await pool.query(
      `DELETE FROM guardados WHERE usuario_id=$1 AND post_id=$2 RETURNING id`,
      [usuarioId, postId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ ok: false, error: "Este post no estaba guardado" });
    }

    return res.json({ ok: true, message: "Post eliminado de guardados" });
  } catch (e) {
    console.error("unsavePost error:", e);
    return res.status(500).json({ ok: false, error: "Error al eliminar guardado" });
  }
}
