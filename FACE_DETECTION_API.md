# 🎭 API de Detección Facial - Face-api.js

## 📋 Descripción General

Esta API permite detectar y analizar rostros en imágenes usando **face-api.js**, proporcionando:

- ✅ Detección de rostros (cantidad y ubicación)
- ✅ 68 puntos faciales (landmarks)
- ✅ 7 expresiones faciales (feliz, triste, enojado, neutral, asustado, disgustado, sorprendido)
- ✅ Estimación de edad
- ✅ Detección de género con nivel de confianza
- ✅ Cache de análisis en base de datos

---

## 🚀 Endpoints Disponibles

### 1. **POST** `/api/face-detection/analyze`

Analiza una imagen subida vía **FormData**.

#### Headers
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### Body (FormData)
- `image`: Archivo de imagen (JPEG, PNG, WEBP, GIF)
- Tamaño máximo: **10 MB**

#### Ejemplo con cURL
```bash
curl -X POST http://localhost:4000/api/face-detection/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/image.jpg"
```

#### Ejemplo con JavaScript (Fetch)
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

const response = await fetch('http://localhost:4000/api/face-detection/analyze', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log(result);
```

#### Respuesta Exitosa (200 OK)
```json
{
  "success": true,
  "analysis": {
    "hasFaces": true,
    "faceCount": 2,
    "faces": [
      {
        "id": 0,
        "boundingBox": {
          "x": 120,
          "y": 85,
          "width": 180,
          "height": 220
        },
        "landmarks": {
          "jawOutline": [{"x": 125, "y": 90}, ...],
          "leftEyebrow": [{"x": 140, "y": 95}, ...],
          "rightEyebrow": [{"x": 210, "y": 95}, ...],
          "noseBridge": [{"x": 175, "y": 120}, ...],
          "leftEye": [{"x": 155, "y": 105}, ...],
          "rightEye": [{"x": 195, "y": 105}, ...],
          "mouth": [{"x": 175, "y": 180}, ...],
          "total": 68
        },
        "expressions": {
          "neutral": 15,
          "happy": 75,
          "sad": 2,
          "angry": 1,
          "fearful": 1,
          "disgusted": 1,
          "surprised": 5,
          "dominant": {
            "expression": "happy",
            "probability": 75
          }
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

#### Respuesta Sin Rostros (200 OK)
```json
{
  "success": true,
  "analysis": {
    "hasFaces": false,
    "faceCount": 0,
    "faces": [],
    "timestamp": "2025-01-16T10:30:00.000Z"
  }
}
```

---

### 2. **GET** `/api/face-detection/analyze/:postId`

Analiza la imagen de un **post existente** en la base de datos.

#### Headers
```
Authorization: Bearer <token>
```

#### Parámetros
- `postId`: ID del post a analizar

#### Ejemplo con cURL
```bash
curl -X GET http://localhost:4000/api/face-detection/analyze/123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Ejemplo con JavaScript (Fetch)
```javascript
const postId = 123;
const response = await fetch(`http://localhost:4000/api/face-detection/analyze/${postId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const result = await response.json();
console.log(result);
```

#### Respuesta Exitosa (200 OK)
```json
{
  "success": true,
  "analysis": {
    "hasFaces": true,
    "faceCount": 1,
    "faces": [...],
    "timestamp": "2025-01-16T10:30:00.000Z"
  },
  "postId": 123,
  "cached": false,
  "analyzedAt": "2025-01-16T10:30:00.000Z"
}
```

---

### 3. **GET** `/api/face-detection/analyze/:postId/cached`

Obtiene el **análisis cacheado** de un post (si existe).

#### Headers
```
Authorization: Bearer <token>
```

#### Ejemplo con cURL
```bash
curl -X GET http://localhost:4000/api/face-detection/analyze/123/cached \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Respuesta Con Cache (200 OK)
```json
{
  "success": true,
  "analysis": {
    "hasFaces": true,
    "faceCount": 1,
    "faces": [...],
    "timestamp": "2025-01-16T10:30:00.000Z"
  },
  "postId": 123,
  "cached": true,
  "analyzedAt": "2025-01-16T10:30:00.000Z"
}
```

#### Respuesta Sin Cache (404 Not Found)
```json
{
  "success": false,
  "error": "No existe análisis cacheado para este post",
  "message": "Use el endpoint /analyze/:postId para generar un nuevo análisis"
}
```

---

## ❌ Códigos de Error

### 400 - Bad Request
```json
{
  "success": false,
  "error": "No se proporcionó ninguna imagen"
}
```

```json
{
  "success": false,
  "error": "El archivo debe ser una imagen (JPEG, PNG, WEBP, GIF)"
}
```

```json
{
  "success": false,
  "error": "La imagen no debe superar los 10 MB"
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "error": "Token inválido o expirado"
}
```

### 404 - Not Found
```json
{
  "success": false,
  "error": "Post no encontrado"
}
```

### 500 - Internal Server Error
```json
{
  "success": false,
  "error": "Error al analizar la imagen",
  "details": "No se pudieron cargar los modelos"
}
```

---

## 🛠️ Middleware Opcional

### 1. **Análisis Automático al Crear Posts**

Agrega análisis facial automáticamente cuando se crea un post con imagen.

```javascript
// routes/posts.routes.js
import { faceAnalysisMiddleware } from '../middleware/faceAnalysis.middleware.js';

router.post('/posts', 
  verifyToken, 
  upload.single('imagen'), 
  faceAnalysisMiddleware,  // ✅ Agrega esto
  crearPost
);
```

Luego en tu controlador puedes acceder al análisis:

```javascript
// controllers/posts.controller.js
export async function crearPost(req, res) {
  const { faceAnalysis } = req; // ✅ El análisis está aquí
  
  // Guardar en DB
  await pool.query(
    'INSERT INTO posts (usuario_id, imagen_url, face_analysis, face_analysis_timestamp) VALUES ($1, $2, $3, NOW())',
    [userId, imageUrl, JSON.stringify(faceAnalysis)]
  );
}
```

### 2. **Análisis en Background**

No bloquea la creación del post, analiza después de responder.

```javascript
import { faceAnalysisBackgroundMiddleware } from '../middleware/faceAnalysis.middleware.js';

router.post('/posts', 
  verifyToken, 
  upload.single('imagen'), 
  faceAnalysisBackgroundMiddleware,  // ✅ Analiza en background
  crearPost
);
```

### 3. **Requerir Rostros en la Imagen**

Valida que la imagen contenga al menos un rostro.

```javascript
import { requireFacesMiddleware } from '../middleware/faceAnalysis.middleware.js';

router.post('/posts/faces-only', 
  verifyToken, 
  upload.single('imagen'), 
  requireFacesMiddleware,  // ✅ Requiere rostros
  crearPost
);
```

---

## 🗄️ Estructura de Base de Datos

### Columnas agregadas a la tabla `posts`:

```sql
-- Análisis facial completo (JSON)
face_analysis JSONB

-- Timestamp del análisis
face_analysis_timestamp TIMESTAMP

-- Índices
CREATE INDEX idx_posts_face_analysis ON posts USING GIN (face_analysis);
CREATE INDEX idx_posts_has_face_analysis ON posts ((face_analysis IS NOT NULL));
```

### Migración

Ejecuta el archivo de migración:

```bash
psql -U postgres -d clone_ig -f migrations/add_face_analysis_columns.sql
```

O desde Node.js:

```bash
node ejecutar-migracion.js
```

---

## 📦 Dependencias Instaladas

```json
{
  "face-api.js": "^0.22.2",
  "canvas": "^2.11.2",
  "@tensorflow/tfjs": "^4.x",
  "axios": "^1.x"
}
```

---

## 🧪 Pruebas

### 1. Probar con Postman

1. **Endpoint**: `POST http://localhost:4000/api/face-detection/analyze`
2. **Authorization**: Bearer Token (obtener de login)
3. **Body**: Form-data
   - Key: `image` (tipo: File)
   - Value: Selecciona una imagen
4. **Send** ✅

### 2. Probar con Node.js

```javascript
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const formData = new FormData();
formData.append('image', fs.createReadStream('./test-image.jpg'));

const response = await axios.post('http://localhost:4000/api/face-detection/analyze', formData, {
  headers: {
    ...formData.getHeaders(),
    'Authorization': `Bearer ${token}`
  }
});

console.log(response.data);
```

---

## 🎯 Casos de Uso

### 1. **Filtrar posts por expresión facial**

```sql
-- Buscar posts con personas felices
SELECT * FROM posts 
WHERE face_analysis->'faces' @> '[{"expressions": {"dominant": {"expression": "happy"}}}]';
```

### 2. **Buscar posts con múltiples rostros**

```sql
-- Posts con 2 o más rostros
SELECT * FROM posts 
WHERE (face_analysis->>'faceCount')::int >= 2;
```

### 3. **Buscar posts con personas de cierta edad**

```sql
-- Posts con personas menores de 30 años
SELECT * FROM posts, jsonb_array_elements(face_analysis->'faces') AS face
WHERE (face->>'age')::int < 30;
```

---

## ⚠️ Notas Importantes

1. **Modelos ML**: Se cargan automáticamente al iniciar el servidor desde `ml-models/face-api/`
2. **Rendimiento**: El primer análisis puede tardar 1-2 segundos, los siguientes son más rápidos
3. **Cache**: Los análisis se guardan en la base de datos para evitar re-procesar
4. **Imágenes grandes**: Se recomienda no superar 10 MB
5. **Videos**: No soportado actualmente (solo imágenes)

---

## 📚 Recursos

- [face-api.js GitHub](https://github.com/justadudewhohacks/face-api.js)
- [TensorFlow.js](https://www.tensorflow.org/js)
- [Canvas Node.js](https://github.com/Automattic/node-canvas)

---

¡Disfruta del análisis facial en tu aplicación! 🎭✨
