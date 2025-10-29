// server/controllers/mensajes.controller.js
import { pool } from "../Config/db.js";

/** Transformar fila de DB a formato frontend */
function rowToMessage(r) {
  return {
    id: r.id,
    conversationId: r.conversacion_id,
    senderId: r.emisor_id,
    receiverId: r.receptor_id,
    text: r.mensaje,
    createdAt: r.created_at,
    read: r.leido,
  };
}

/** GET /api/messages/conversations - Listar conversaciones del usuario */
export async function listConversations(req, res) {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ ok: false, error: "No autorizado" });

    // Obtener últimas conversaciones
    const sql = `
      WITH ultimos_mensajes AS (
        SELECT DISTINCT ON (conversacion_id) 
          id, conversacion_id, emisor_id, receptor_id, mensaje, created_at, leido
        FROM mensajes
        WHERE conversacion_id IN (
          SELECT DISTINCT conversacion_id 
          FROM mensajes 
          WHERE emisor_id = $1 OR receptor_id = $1
        )
        ORDER BY conversacion_id, created_at DESC
      )
      SELECT 
        um.id, um.conversacion_id, um.emisor_id, um.receptor_id, 
        um.mensaje, um.created_at, um.leido,
        u.username, u.avatar_url, u.nombre_completo
      FROM ultimos_mensajes um
      JOIN usuarios u ON (
        CASE 
          WHEN um.emisor_id = $1 THEN u.id = um.receptor_id
          ELSE u.id = um.emisor_id
        END
      )
      ORDER BY um.created_at DESC;
    `;

    const { rows } = await pool.query(sql, [usuarioId]);

    const conversations = rows.map(r => ({
      id: r.conversacion_id,
      lastMessage: {
        text: r.mensaje,
        createdAt: r.created_at,
        isOwn: r.emisor_id === usuarioId,
        read: r.leido,
      },
      user: {
        id: r.emisor_id === usuarioId ? r.receptor_id : r.emisor_id,
        username: r.username,
        avatar: r.avatar_url || "https://i.pravatar.cc/150?img=12",
        name: r.nombre_completo,
      },
    }));

    return res.json({ ok: true, conversations });
  } catch (e) {
    console.error("listConversations error:", e);
    return res.status(500).json({ ok: false, error: "Error obteniendo conversaciones" });
  }
}

/** GET /api/messages/:userId - Obtener mensajes con un usuario específico */
export async function getMessages(req, res) {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ ok: false, error: "No autorizado" });

    const otherUserId = parseInt(req.params.userId, 10);
    if (!otherUserId) return res.status(400).json({ ok: false, error: "Usuario inválido" });

    const page = Math.max(parseInt(req.query.page ?? "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? "50", 10), 1), 100);
    const offset = (page - 1) * limit;

    // Obtener o crear conversación
    let conversacionId;
    const conversacionCheck = await pool.query(
      `SELECT DISTINCT conversacion_id 
       FROM mensajes 
       WHERE (emisor_id = $1 AND receptor_id = $2) 
          OR (emisor_id = $2 AND receptor_id = $1)
       LIMIT 1`,
      [usuarioId, otherUserId]
    );

    if (conversacionCheck.rows.length > 0) {
      conversacionId = conversacionCheck.rows[0].conversacion_id;
    } else {
      // Crear nuevo ID de conversación con formato conv_id1_id2
      const ids = [usuarioId, otherUserId].sort((a, b) => a - b);
      conversacionId = `conv_${ids[0]}_${ids[1]}`;
    }

    // Obtener mensajes
    const sql = `
      SELECT 
        m.id, m.conversacion_id, m.emisor_id, m.receptor_id, 
        m.mensaje, m.created_at, m.leido,
        u.username, u.avatar_url
      FROM mensajes m
      JOIN usuarios u ON u.id = m.emisor_id
      WHERE m.conversacion_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const { rows } = await pool.query(sql, [conversacionId, limit, offset]);

    // Marcar mensajes como leídos
    await pool.query(
      `UPDATE mensajes SET leido = true 
       WHERE conversacion_id = $1 AND receptor_id = $2 AND leido = false`,
      [conversacionId, usuarioId]
    );

    const messages = rows.map(r => ({
      ...rowToMessage(r),
      sender: {
        id: r.emisor_id,
        username: r.username,
        avatar: r.avatar_url || "https://i.pravatar.cc/150?img=12",
      },
      isOwn: r.emisor_id === usuarioId,
    })).reverse(); // Más antiguos primero

    return res.json({ ok: true, conversationId: conversacionId, messages });
  } catch (e) {
    console.error("getMessages error:", e);
    return res.status(500).json({ ok: false, error: "Error obteniendo mensajes" });
  }
}

/** POST /api/messages/:userId - Enviar mensaje (REST - usado como fallback) */
export async function sendMessage(req, res) {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ ok: false, error: "No autorizado" });

    const receptorId = parseInt(req.params.userId, 10);
    if (!receptorId) return res.status(400).json({ ok: false, error: "Usuario inválido" });

    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ ok: false, error: "El mensaje no puede estar vacío" });
    }

    // ID de conversación
    const conversacionId = `conv_${[usuarioId, receptorId].sort((a, b) => a - b).join('_')}`;

    // Insertar mensaje
    const { rows } = await pool.query(
      `INSERT INTO mensajes (conversacion_id, emisor_id, receptor_id, mensaje)
       VALUES ($1, $2, $3, $4)
       RETURNING id, conversacion_id, emisor_id, receptor_id, mensaje, created_at, leido`,
      [conversacionId, usuarioId, receptorId, text.trim()]
    );

    const newMessage = rowToMessage(rows[0]);

    // Obtener datos del emisor
    const userQuery = await pool.query(
      `SELECT username, avatar_url FROM usuarios WHERE id=$1`,
      [usuarioId]
    );

    return res.json({
      ok: true,
      message: {
        ...newMessage,
        sender: {
          id: usuarioId,
          username: userQuery.rows[0]?.username || "user",
          avatar: userQuery.rows[0]?.avatar_url || "https://i.pravatar.cc/150?img=12",
        },
        isOwn: true,
      },
    });
  } catch (e) {
    console.error("sendMessage error:", e);
    return res.status(500).json({ ok: false, error: "Error al enviar mensaje" });
  }
}

/** DELETE /api/messages/:messageId - Eliminar mensaje */
export async function deleteMessage(req, res) {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) return res.status(401).json({ ok: false, error: "No autorizado" });

    const messageId = parseInt(req.params.messageId, 10);
    if (!messageId) return res.status(400).json({ ok: false, error: "Mensaje inválido" });

    // Verificar que el mensaje pertenece al usuario
    const result = await pool.query(
      `DELETE FROM mensajes WHERE id=$1 AND emisor_id=$2 RETURNING id`,
      [messageId, usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Mensaje no encontrado o no tienes permiso" });
    }

    return res.json({ ok: true, message: "Mensaje eliminado" });
  } catch (e) {
    console.error("deleteMessage error:", e);
    return res.status(500).json({ ok: false, error: "Error al eliminar mensaje" });
  }
}
