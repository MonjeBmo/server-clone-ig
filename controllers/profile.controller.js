// server/controllers/profile.controller.js
import { pool } from "../Config/db.js";

/* ---------- helpers ---------- */
function dbUserToProfile(u) {
  return {
    id: u.id,
    username: u.username,
    name: u.nombre_completo || u.username,
    bio: u.biografia || "",
    avatar: u.avatar_url || "https://i.pravatar.cc/150?img=12",
    website: u.sitio_web || "",
  };
}

async function getStatsForUser(userId) {
  const [{ rows: posts }, { rows: followers }, { rows: following }] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS c FROM public.posts WHERE estado=true AND usuario_id=$1`, [userId]),
    pool.query(`SELECT COUNT(*)::int AS c FROM public.seguidores WHERE seguido_id=$1`, [userId]),
    pool.query(`SELECT COUNT(*)::int AS c FROM public.seguidores WHERE seguidor_id=$1`, [userId]),
  ]);
  return {
    posts: posts[0]?.c ?? 0,
    followers: followers[0]?.c ?? 0,
    following: following[0]?.c ?? 0,
  };
}

/* ---------- GET /api/profile/me ---------- */
export async function getMyProfile(req, res) {
  try {
    const meId = req.user?.id;
    if (!meId) return res.status(401).json({ ok: false, error: "No autorizado" });

    const { rows } = await pool.query(`SELECT * FROM public.usuarios WHERE id=$1 AND estado=true`, [meId]);
    if (!rows[0]) return res.status(404).json({ ok: false, error: "Usuario no encontrado" });

    const profile = dbUserToProfile(rows[0]);
    const stats = await getStatsForUser(meId);

    return res.json({ ok: true, profile: { ...profile, isOwnProfile: true, stats } });
  } catch (e) {
    console.error("getMyProfile error:", e);
    res.status(500).json({ ok: false, error: "Error obteniendo mi perfil" });
  }
}

/* ---------- GET /api/profile/:username ---------- */
export async function getProfileByUsername(req, res) {
  try {
    const { username } = req.params;
    const viewerId = req.user?.id ?? null;

    const { rows } = await pool.query(`SELECT * FROM public.usuarios WHERE username=$1 AND estado=true`, [username]);
    if (!rows[0]) return res.status(404).json({ ok: false, error: "Usuario no encontrado" });

    const u = rows[0];
    const profile = dbUserToProfile(u);
    const stats = await getStatsForUser(u.id);

    let isFollowing = false;
    if (viewerId && viewerId !== u.id) {
      const { rows: fol } = await pool.query(
        `SELECT 1 FROM public.seguidores WHERE seguidor_id=$1 AND seguido_id=$2`,
        [viewerId, u.id]
      );
      isFollowing = !!fol[0];
    }

    return res.json({
      ok: true,
      profile: {
        ...profile,
        isOwnProfile: viewerId === u.id,
        isFollowing,
        stats,
      },
    });
  } catch (e) {
    console.error("getProfileByUsername error:", e);
    res.status(500).json({ ok: false, error: "Error obteniendo perfil" });
  }
}

/* ---------- PUT /api/profile/me (editar) ---------- */
export async function updateMyProfile(req, res) {
  try {
    const meId = req.user?.id;
    if (!meId) return res.status(401).json({ ok: false, error: "No autorizado" });

    const { nombre_completo, biografia, sitio_web, avatar_url } = req.body;

    const { rows } = await pool.query(
      `UPDATE public.usuarios
       SET nombre_completo = COALESCE($1, nombre_completo),
           biografia       = COALESCE($2, biografia),
           sitio_web       = COALESCE($3, sitio_web),
           avatar_url      = COALESCE($4, avatar_url)
       WHERE id=$5
       RETURNING *`,
      [nombre_completo, biografia, sitio_web, avatar_url, meId]
    );

    const profile = dbUserToProfile(rows[0]);
    const stats = await getStatsForUser(meId);
    return res.json({ ok: true, profile: { ...profile, isOwnProfile: true, stats } });
  } catch (e) {
    console.error("updateMyProfile error:", e);
    res.status(500).json({ ok: false, error: "Error actualizando perfil" });
  }
}

/* ---------- POST/DELETE /api/profile/:id/follow ---------- */
export async function followUser(req, res) {
  try {
    const meId = req.user?.id;
    const targetId = parseInt(req.params.id, 10);
    if (!meId) return res.status(401).json({ ok: false, error: "No autorizado" });
    if (!targetId || targetId === meId) return res.status(400).json({ ok: false, error: "Destino inválido" });

    await pool.query(
      `INSERT INTO public.seguidores(seguidor_id, seguido_id) VALUES($1,$2)
       ON CONFLICT (seguidor_id, seguido_id) DO NOTHING`,
      [meId, targetId]
    );
    return res.json({ ok: true });
  } catch (e) {
    console.error("followUser error:", e);
    res.status(500).json({ ok: false, error: "No se pudo seguir" });
  }
}

export async function unfollowUser(req, res) {
  try {
    const meId = req.user?.id;
    const targetId = parseInt(req.params.id, 10);
    if (!meId) return res.status(401).json({ ok: false, error: "No autorizado" });
    if (!targetId || targetId === meId) return res.status(400).json({ ok: false, error: "Destino inválido" });

    await pool.query(`DELETE FROM public.seguidores WHERE seguidor_id=$1 AND seguido_id=$2`, [meId, targetId]);
    return res.json({ ok: true });
  } catch (e) {
    console.error("unfollowUser error:", e);
    res.status(500).json({ ok: false, error: "No se pudo dejar de seguir" });
  }
}

