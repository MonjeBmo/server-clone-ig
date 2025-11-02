# 🧪 Guía de Prueba Rápida - Face Detection API

## ✅ Estado del Servidor

```
🚀 Servidor corriendo en puerto 4000
📦 Modelos de face-api.js cargados exitosamente
🔌 Socket.IO listo para conexiones
```

---

## 🔐 Paso 1: Obtener Token de Autenticación

Primero necesitas un token de autenticación. Si ya tienes una cuenta:

### Login (PowerShell)
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"tu@email.com","password":"tupassword"}'

$token = $response.token
Write-Host "Token: $token"
```

O con cURL (si tienes instalado):
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tu@email.com","password":"tupassword"}'
```

**Guarda el token** que recibes, lo necesitarás para las siguientes pruebas.

---

## 🖼️ Paso 2: Probar Análisis de Imagen

### Opción A: Con PowerShell

```powershell
# Configurar token
$token = "TU_TOKEN_AQUI"

# Preparar la imagen
$imagePath = "C:\ruta\a\tu\imagen.jpg"
$boundary = [System.Guid]::NewGuid().ToString()
$ContentType = "multipart/form-data; boundary=$boundary"

# Leer imagen en bytes
$imageBytes = [System.IO.File]::ReadAllBytes($imagePath)
$imageEncoded = [System.Text.Encoding]::GetEncoding("ISO-8859-1").GetString($imageBytes)

# Crear body multipart
$bodyLines = @(
    "--$boundary",
    'Content-Disposition: form-data; name="image"; filename="image.jpg"',
    'Content-Type: image/jpeg',
    '',
    $imageEncoded,
    "--$boundary--"
) -join "`r`n"

# Enviar request
$response = Invoke-RestMethod `
  -Uri "http://localhost:4000/api/face-detection/analyze" `
  -Method POST `
  -ContentType $ContentType `
  -Headers @{Authorization="Bearer $token"} `
  -Body ([System.Text.Encoding]::GetEncoding("ISO-8859-1").GetBytes($bodyLines))

# Ver resultado
$response | ConvertTo-Json -Depth 10
```

### Opción B: Con Postman (Recomendado)

1. **Abrir Postman**
2. **Crear Nueva Request**:
   - Method: `POST`
   - URL: `http://localhost:4000/api/face-detection/analyze`
3. **Headers**:
   - Key: `Authorization`
   - Value: `Bearer TU_TOKEN_AQUI`
4. **Body**:
   - Seleccionar `form-data`
   - Key: `image` (cambiar tipo a **File**)
   - Value: Seleccionar una imagen con rostros
5. **Send** ✅

### Respuesta Esperada

```json
{
  "success": true,
  "analysis": {
    "hasFaces": true,
    "faceCount": 1,
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
          "jawOutline": [...],
          "leftEyebrow": [...],
          "rightEyebrow": [...],
          "noseBridge": [...],
          "leftEye": [...],
          "rightEye": [...],
          "mouth": [...],
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

---

## 📊 Paso 3: Analizar un Post Existente

### Con PowerShell
```powershell
$token = "TU_TOKEN_AQUI"
$postId = 1  # ID de un post con imagen

$response = Invoke-RestMethod `
  -Uri "http://localhost:4000/api/face-detection/analyze/$postId" `
  -Method GET `
  -Headers @{Authorization="Bearer $token"}

$response | ConvertTo-Json -Depth 10
```

### Con Postman
1. **Method**: `GET`
2. **URL**: `http://localhost:4000/api/face-detection/analyze/1`
3. **Headers**: `Authorization: Bearer TU_TOKEN_AQUI`
4. **Send** ✅

---

## 💾 Paso 4: Obtener Análisis Cacheado

### Con PowerShell
```powershell
$token = "TU_TOKEN_AQUI"
$postId = 1

$response = Invoke-RestMethod `
  -Uri "http://localhost:4000/api/face-detection/analyze/$postId/cached" `
  -Method GET `
  -Headers @{Authorization="Bearer $token"}

$response | ConvertTo-Json -Depth 10
```

### Con Postman
1. **Method**: `GET`
2. **URL**: `http://localhost:4000/api/face-detection/analyze/1/cached`
3. **Headers**: `Authorization: Bearer TU_TOKEN_AQUI`
4. **Send** ✅

---

## 🗄️ Paso 5: Ejecutar Migración de Base de Datos

Para agregar las columnas necesarias a la tabla `posts`:

```powershell
# Opción 1: Con psql
psql -U postgres -d clone_ig -f migrations\add_face_analysis_columns.sql

# Opción 2: Con Node.js (si tienes ejecutar-migracion.js configurado)
node ejecutar-migracion.js
```

Esto creará:
- ✅ Columna `face_analysis` (JSONB)
- ✅ Columna `face_analysis_timestamp` (TIMESTAMP)
- ✅ Índices para optimización

---

## 🎯 Casos de Prueba

### 1. Imagen con rostros
- **Resultado**: Detecta rostros, landmarks, expresiones, edad, género

### 2. Imagen sin rostros
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

### 3. Archivo no es imagen
```json
{
  "success": false,
  "error": "El archivo debe ser una imagen (JPEG, PNG, WEBP, GIF)"
}
```

### 4. Sin token
```json
{
  "ok": false,
  "error": "No autorizado (falta token)"
}
```

---

## 🔍 Verificar Logs del Servidor

Los logs deberían mostrar:

```
📦 Cargando modelos de face-api.js desde: C:\Users\yosoy\server-clone-ig\ml-models\face-api
✅ Todos los modelos cargados exitosamente
✅ Modelos de face-api.js cargados exitosamente
🚀 Servidor corriendo en puerto 4000
```

Si ves algún error, revisa:
1. ✅ Que exista la carpeta `ml-models/face-api/` con los 14 archivos
2. ✅ Que las dependencias estén instaladas (`npm install`)
3. ✅ Que el servidor tenga permisos de lectura

---

## 📱 Integración con Frontend

### Ejemplo con React/Axios

```javascript
import axios from 'axios';

async function analyzeImage(file, token) {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await axios.post(
      'http://localhost:4000/api/face-detection/analyze',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    console.log('Análisis:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Uso
const fileInput = document.getElementById('imageInput');
const file = fileInput.files[0];
const result = await analyzeImage(file, 'tu_token');
```

---

## ✨ ¡Listo!

Tu API de detección facial está funcionando correctamente. Ahora puedes:

1. ✅ Analizar imágenes subidas directamente
2. ✅ Analizar posts existentes
3. ✅ Obtener análisis cacheados
4. ✅ Integrar middleware opcional en creación de posts

Para más detalles, consulta **FACE_DETECTION_API.md** 📚
