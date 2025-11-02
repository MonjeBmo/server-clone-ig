
# 🧠 1. Objetivo del backend

Backend RESTful seguro y mantenible que permita:

* Registro y login de usuarios (con password hasheado).
* CRUD de posts (imagen / video).
* Likes, comentarios, seguidores.
* Mensajes entre usuarios (chat básico).
* Bitácora automática de acciones.
* Búsqueda de usuarios y posts.
* 🎭 **Detección facial con IA** (face-api.js) - landmarks, expresiones, edad, género

---

# 🧩 2. Estructura de carpetas 

```bash
zen-backend/
├── src/
│   ├── config/
│   │   ├── db.js
│   │   └── env.js
│   │
│   ├── models/
│   │   ├── usuario.model.js
│   │   ├── post.model.js
│   │   ├── like.model.js
│   │   ├── comentario.model.js
│   │   ├── mensaje.model.js
│   │   ├── seguidor.model.js
│   │   └── bitacora.model.js
│   │
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── usuarios.controller.js
│   │   ├── posts.controller.js
│   │   ├── likes.controller.js
│   │   ├── comentarios.controller.js
│   │   ├── mensajes.controller.js
│   │   └── bitacora.controller.js
│   │
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── usuarios.service.js
│   │   ├── posts.service.js
│   │   ├── mensajes.service.js
│   │   └── bitacora.service.js
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   └── logger.middleware.js
│   │
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── usuarios.routes.js
│   │   ├── posts.routes.js
│   │   ├── mensajes.routes.js
│   │   ├── comentarios.routes.js
│   │   └── index.routes.js
│   │
│   ├── utils/
│   │   ├── bcrypt.util.js
│   │   ├── jwt.util.js
│   │   └── response.util.js
│   │
│   └── app.js
│
├── package.json
├── .env
└── README.md
```

---

## api

### Registro

Ruta: POST http://localhost:4000/api/auth/register

```
{
  "username": "jobzen",
  "nombre_completo": "Job Anleu",
  "email": "job@zen.com",
  "password": "123456"
}
```

### Login

Ruta: POST http://localhost:4000/api/auth/login

```
{
  "email": "job@zen.com",
  "password": "123456"
}
```

---

## 🎭 Face Detection API (Nuevo)

### Características
- ✅ Detección de rostros con ubicación precisa
- ✅ 68 puntos faciales (facial landmarks)
- ✅ 7 expresiones faciales (happy, sad, angry, neutral, fearful, disgusted, surprised)
- ✅ Estimación de edad y género con confianza
- ✅ Cache automático en base de datos
- ✅ Análisis de imágenes subidas o posts existentes

### Endpoints

#### Analizar imagen subida
```
POST /api/face-detection/analyze
Headers: Authorization: Bearer <token>
Body: FormData con campo 'image' (archivo)
```

#### Analizar post existente
```
GET /api/face-detection/analyze/:postId
Headers: Authorization: Bearer <token>
```

#### Obtener análisis cacheado
```
GET /api/face-detection/analyze/:postId/cached
Headers: Authorization: Bearer <token>
```

### 📚 Documentación Completa
- **[QUICK_START_FACE_API.md](./QUICK_START_FACE_API.md)** - Guía de inicio rápido
- **[FACE_DETECTION_API.md](./FACE_DETECTION_API.md)** - Documentación completa
- **[TEST_FACE_API.md](./TEST_FACE_API.md)** - Guía de pruebas
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Resumen técnico

### 🚀 Inicio Rápido
```powershell
# 1. Iniciar servidor
npm run dev

# 2. Ejecutar migración (si no se ha hecho)
node ejecutar-migracion-face-api.js

# 3. Probar con script automático
node test-face-api.js
```

