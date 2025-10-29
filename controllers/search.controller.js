// server/controllers/search.controller.js
import { pool } from "../Config/db.js";

/* Normalizadores para el front */
function rowToUser(u) {
  return {
    id: u.id,
    username: u.username,
    name: u.nombre_completo || u.username,
    avatar: u.avatar_url || "https://i.pravatar.cc/150?img=12",
    bio: u.biografia || "",
  };
}

function rowToPost(p) {
  return {
    id: p.id,
    caption: p.descripcion || "",
    likes: p.likes_count ?? 0,
    comments: p.comentarios_count ?? 0,
    createdAt: p.fecha_publicacion,
    media: p.url_contenido
      ? { type: p.tipo === "video" ? "video" : "image", url: p.url_contenido }
      : null,
    user: {
      id: p.usuario_id,
      username: p.username,
      avatar: p.avatar_url || "https://i.pravatar.cc/150?img=12",
    },
  };
}

/* -------- GET /api/search/users?q=&page=&limit= -------- */
export async function searchUsers(req, res) {
  try {
    const q = (req.query.q ?? "").trim();
    const page  = Math.max(parseInt(req.query.page ?? "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? "20", 10), 1), 50);
    const offset = (page - 1) * limit;

    if (!q) return res.json({ ok: true, page, limit, total: 0, items: [] });

    const like = `%${q}%`;
    const params = [like, like];

    const { rows: tot } = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM public.usuarios
       WHERE estado=true AND (username ILIKE $1 OR nombre_completo ILIKE $2)`,
      params
    );
    const total = tot[0]?.total ?? 0;

    const { rows } = await pool.query(
      `SELECT id, username, nombre_completo, avatar_url, biografia
       FROM public.usuarios
       WHERE estado=true AND (username ILIKE $1 OR nombre_completo ILIKE $2)
       ORDER BY username ASC
       LIMIT $3 OFFSET $4`,
      [...params, limit, offset]
    );

    res.json({ ok: true, page, limit, total, items: rows.map(rowToUser) });
  } catch (e) {
    console.error("searchUsers error:", e);
    res.status(500).json({ ok: false, error: "Error buscando usuarios" });
  }
}

/* -------- GET /api/search/posts?q=&page=&limit= -------- */
export async function searchPosts(req, res) {
  try {
    const q = (req.query.q ?? "").trim();
    const page  = Math.max(parseInt(req.query.page ?? "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? "20", 10), 1), 50);
    const offset = (page - 1) * limit;

    if (!q) return res.json({ ok: true, page, limit, total: 0, items: [] });

    const like = `%${q}%`;

    const { rows: tot } = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM public.posts p
       WHERE p.estado=true AND p.descripcion ILIKE $1`,
      [like]
    );
    const total = tot[0]?.total ?? 0;

    const { rows } = await pool.query(
      `SELECT
         p.id, p.usuario_id, p.tipo, p.url_contenido, p.descripcion,
         p.likes_count, p.comentarios_count, p.fecha_publicacion,
         u.username, u.avatar_url
       FROM public.posts p
       JOIN public.usuarios u ON u.id = p.usuario_id
       WHERE p.estado=true AND p.descripcion ILIKE $1
       ORDER BY p.fecha_publicacion DESC
       LIMIT $2 OFFSET $3`,
      [like, limit, offset]
    );

    res.json({ ok: true, page, limit, total, items: rows.map(rowToPost) });
  } catch (e) {
    console.error("searchPosts error:", e);
    res.status(500).json({ ok: false, error: "Error buscando posts" });
  }
}

/* -------- GET /api/search/all?q=&uLimit=&pLimit= --------
   Devuelve 2 buckets: users y posts (cada uno paginado simple por límite). */
export async function searchAll(req, res) {
  try {
    const q = (req.query.q ?? "").trim();
    const uLimit = Math.min(Math.max(parseInt(req.query.uLimit ?? "5", 10), 1), 20);
    const pLimit = Math.min(Math.max(parseInt(req.query.pLimit ?? "9", 10), 1), 50);
    if (!q) return res.json({ ok: true, users: [], posts: [] });

    const like = `%${q}%`;

    const [uRes, pRes] = await Promise.all([
      pool.query(
        `SELECT id, username, nombre_completo, avatar_url, biografia
         FROM public.usuarios
         WHERE estado=true AND (username ILIKE $1 OR nombre_completo ILIKE $1)
         ORDER BY username ASC
         LIMIT $2`,
        [like, uLimit]
      ),
      pool.query(
        `SELECT
           p.id, p.usuario_id, p.tipo, p.url_contenido, p.descripcion,
           p.likes_count, p.comentarios_count, p.fecha_publicacion,
           u.username, u.avatar_url
         FROM public.posts p
         JOIN public.usuarios u ON u.id = p.usuario_id
         WHERE p.estado=true AND p.descripcion ILIKE $1
         ORDER BY p.fecha_publicacion DESC
         LIMIT $2`,
        [like, pLimit]
      ),
    ]);

    res.json({
      ok: true,
      users: uRes.rows.map(rowToUser),
      posts: pRes.rows.map(rowToPost),
    });
  } catch (e) {
    console.error("searchAll error:", e);
    res.status(500).json({ ok: false, error: "Error en búsqueda" });
  }
}
