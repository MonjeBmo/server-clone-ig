# 🎭 Face Detection API - Quick Start

## 🚀 Inicio Rápido

### 1. Verificar que el servidor esté corriendo

```powershell
npm run dev
```

Deberías ver:
```
✅ Todos los modelos cargados exitosamente
✅ Modelos de face-api.js cargados exitosamente
🚀 Servidor corriendo en puerto 4000
```

### 2. La migración ya está ejecutada ✅

```
✅ Columna face_analysis (JSONB)
✅ Columna face_analysis_timestamp (TIMESTAMP)
✅ Índices creados
```

---

## 📋 3 Formas de Probar la API

### 🔷 Opción 1: Postman (Más Fácil)

1. **Obtener Token**
   - `POST http://localhost:4000/api/auth/login`
   - Body (JSON): `{"email": "tu@email.com", "password": "tupassword"}`
   - Copiar el `token` de la respuesta

2. **Analizar Imagen**
   - `POST http://localhost:4000/api/face-detection/analyze`
   - Headers: `Authorization: Bearer TU_TOKEN`
   - Body: `form-data` → Key: `image` (tipo File) → Seleccionar imagen
   - Enviar ✅

### 🔷 Opción 2: Script de Prueba Automático

```powershell
# 1. Editar test-face-api.js y cambiar:
#    - TEST_EMAIL
#    - TEST_PASSWORD
#    - TEST_IMAGE (coloca una imagen en la raíz)
#    - TEST_POST_ID

# 2. Ejecutar
node test-face-api.js
```

Verás un análisis completo con emojis y colores 🎨

### 🔷 Opción 3: cURL

```powershell
# 1. Login
$response = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"tu@email.com","password":"tupass"}'
$token = $response.token

# 2. Analizar (necesitas configurar FormData manualmente)
# Recomendamos usar Postman o el script de prueba
```

---

## 📡 Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/face-detection/analyze` | Analiza imagen subida (FormData) |
| GET | `/api/face-detection/analyze/:postId` | Analiza imagen de post existente |
| GET | `/api/face-detection/analyze/:postId/cached` | Obtiene análisis cacheado |

**Todos requieren**: `Authorization: Bearer TOKEN`

---

## 🎯 Estructura de Respuesta

```json
{
  "success": true,
  "analysis": {
    "hasFaces": true,
    "faceCount": 1,
    "faces": [
      {
        "id": 0,
        "boundingBox": { "x": 120, "y": 85, "width": 180, "height": 220 },
        "landmarks": {
          "jawOutline": [...],
          "leftEyebrow": [...],
          "total": 68
        },
        "expressions": {
          "neutral": 15,
          "happy": 75,
          "sad": 2,
          "dominant": { "expression": "happy", "probability": 75 }
        },
        "age": 28,
        "gender": "female",
        "genderConfidence": 92
      }
    ],
    "timestamp": "2025-01-16T10:30:00.000Z"
  }
}
```

---

## 🛠️ Integración Opcional: Análisis Automático

Para analizar automáticamente cada post al crearlo:

```javascript
// routes/posts.routes.js
import { faceAnalysisMiddleware } from '../middleware/faceAnalysis.middleware.js';

router.post('/posts', 
  requireAuth, 
  upload.single('imagen'), 
  faceAnalysisMiddleware,  // ✅ Agrega esta línea
  crearPost
);
```

Luego en tu controlador:
```javascript
export async function crearPost(req, res) {
  const { faceAnalysis } = req; // ✅ Análisis disponible aquí
  
  // Guardar en DB junto con el post
  await pool.query(
    'INSERT INTO posts (..., face_analysis, face_analysis_timestamp) VALUES (..., $1, NOW())',
    [..., JSON.stringify(faceAnalysis)]
  );
}
```

---

## 📚 Documentación Completa

- **FACE_DETECTION_API.md** - Documentación detallada de la API
- **TEST_FACE_API.md** - Guía completa de pruebas
- **IMPLEMENTATION_SUMMARY.md** - Resumen de la implementación

---

## ✅ Checklist de Verificación

- ✅ Servidor corriendo en puerto 4000
- ✅ Modelos ML cargados (14 archivos)
- ✅ Migración de BD ejecutada
- ✅ Columnas `face_analysis` y `face_analysis_timestamp` creadas
- ✅ Índices de búsqueda creados
- ✅ Endpoints disponibles en `/api/face-detection/*`

---

## 🎉 ¡Listo para Usar!

Tu API de detección facial está completamente funcional. 

**Siguiente paso recomendado**: Probar con Postman o ejecutar `node test-face-api.js`

¿Dudas? Revisa **FACE_DETECTION_API.md** 📖
