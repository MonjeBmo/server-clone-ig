
# 🧠 1. Objetivo del backend

Backend RESTful seguro y mantenible que permita:

* Registro y login de usuarios (con password hasheado).
* CRUD de posts (imagen / video).
* Likes, comentarios, seguidores.
* Mensajes entre usuarios (chat básico).
* Bitácora automática de acciones.
* Búsqueda de usuarios y posts.

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

