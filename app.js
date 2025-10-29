import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes.js";
import path from "path";
import postsRoutes from "./routes/posts.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import searchRoutes from "./routes/search.routes.js";
import comentariosRoutes from "./routes/comentarios.routes.js";
import mensajesRoutes from "./routes/mensajes.routes.js";
import { fileURLToPath } from "url";
import { env } from "./Config/env.js";
import { verifyToken } from "./utils/jwt.util.js";
import { pool } from "./Config/db.js";
import uploadsRoutes from "./routes/uploads.routes.js";

const app = express();
const httpServer = createServer(app);

// Configurar Socket.IO con CORS
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"], // URLs del frontend
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/auth", authRoutes);
// Servir archivos subidos
// ✅ monta como API, no como carpeta estática
app.use("/api/uploads", uploadsRoutes);
// Rutas
app.use("/api/posts", postsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/search", searchRoutes);
app.use("/api", comentariosRoutes); // /api/posts/:postId/comments
app.use("/api/messages", mensajesRoutes);
app.get("/", (_req, res) => res.send("Zen Backend API"));

// ==================== SOCKET.IO ====================

// Almacenar usuarios conectados: { userId: socketId }
const connectedUsers = new Map();

// Middleware de autenticación para Socket.IO
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("No token provided"));
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.sub) {
      return next(new Error("Invalid token"));
    }

    // Agregar user al socket (sub contiene el ID del usuario)
    socket.userId = decoded.sub;
    socket.username = decoded.username;
    next();
  } catch (error) {
    console.error("Socket auth error:", error);
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  console.log(`✅ Usuario conectado: ${socket.username} (${socket.userId})`);
  
  // Registrar usuario conectado
  connectedUsers.set(socket.userId, socket.id);
  
  // Notificar a todos que el usuario está online
  io.emit("user:online", { userId: socket.userId, username: socket.username });

  // ===== Evento: Unirse a una conversación =====
  socket.on("conversation:join", (conversationId) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`👥 ${socket.username} se unió a conversación: ${conversationId}`);
  });

  // ===== Evento: Enviar mensaje =====
  socket.on("message:send", async (data) => {
    try {
      const { receiverId, text, conversationId } = data;
      
      if (!text || !receiverId) {
        return socket.emit("message:error", { error: "Datos inválidos" });
      }

      // Guardar mensaje en DB
      const { rows } = await pool.query(
        `INSERT INTO mensajes (conversacion_id, emisor_id, receptor_id, mensaje)
         VALUES ($1, $2, $3, $4)
         RETURNING id, conversacion_id, emisor_id, receptor_id, mensaje, created_at, leido`,
        [conversationId, socket.userId, receiverId, text.trim()]
      );

      const newMessage = {
        id: rows[0].id,
        conversationId: rows[0].conversacion_id,
        senderId: rows[0].emisor_id,
        receiverId: rows[0].receptor_id,
        text: rows[0].mensaje,
        createdAt: rows[0].created_at,
        read: rows[0].leido,
        sender: {
          id: socket.userId,
          username: socket.username,
        },
      };

      // Enviar mensaje a ambos usuarios
      // Al emisor (confirmación)
      socket.emit("message:sent", newMessage);

      // Al receptor (si está conectado)
      const receiverSocketId = connectedUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("message:received", newMessage);
      }

      // También emitir a la sala de la conversación
      socket.to(`conversation:${conversationId}`).emit("message:new", newMessage);

      console.log(`📨 Mensaje de ${socket.username} a usuario ${receiverId}`);
    } catch (error) {
      console.error("Error enviando mensaje:", error);
      socket.emit("message:error", { error: "Error al enviar mensaje" });
    }
  });

  // ===== Evento: Usuario está escribiendo =====
  socket.on("typing:start", (data) => {
    const { receiverId, conversationId } = data;
    const receiverSocketId = connectedUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing:user", {
        userId: socket.userId,
        username: socket.username,
        conversationId,
        isTyping: true,
      });
    }
  });

  socket.on("typing:stop", (data) => {
    const { receiverId, conversationId } = data;
    const receiverSocketId = connectedUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing:user", {
        userId: socket.userId,
        username: socket.username,
        conversationId,
        isTyping: false,
      });
    }
  });

  // ===== Evento: Marcar mensajes como leídos =====
  socket.on("messages:read", async (data) => {
    try {
      const { conversationId } = data;
      await pool.query(
        `UPDATE mensajes SET leido = true 
         WHERE conversacion_id = $1 AND receptor_id = $2 AND leido = false`,
        [conversationId, socket.userId]
      );

      // Notificar al otro usuario
      socket.to(`conversation:${conversationId}`).emit("messages:read", {
        conversationId,
        userId: socket.userId,
      });
    } catch (error) {
      console.error("Error marcando mensajes como leídos:", error);
    }
  });

  // ===== Evento: Desconexión =====
  socket.on("disconnect", () => {
    console.log(`❌ Usuario desconectado: ${socket.username}`);
    connectedUsers.delete(socket.userId);
    
    // Notificar que el usuario está offline
    io.emit("user:offline", { userId: socket.userId, username: socket.username });
  });
});

// Exportar io para usarlo en otros lugares si es necesario
export { io };

httpServer.listen(env.port, () => {
  console.log(`🚀 Servidor corriendo en puerto ${env.port}`);
  console.log(`🔌 Socket.IO listo para conexiones`);
});
