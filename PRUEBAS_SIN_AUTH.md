# 🧪 Pruebas Sin Autenticación - Face Detection API

## ⚠️ RUTAS DE PRUEBA TEMPORALES

He agregado rutas **SIN autenticación** para que puedas probar la API sin necesidad de Google Auth.

**IMPORTANTE:** Estas rutas deben eliminarse en producción.

---

## 📡 **Endpoints de Prueba (SIN Token)**

### 1️⃣ **Analizar Imagen Subida**
```
POST http://localhost:4000/api/face-detection/test/analyze
```

**Headers:**
- Solo `Content-Type: multipart/form-data` (automático en Postman)

**Body:**
- Tipo: `form-data`
- Key: `image` (tipo: **File**)
- Value: Seleccionar una imagen con rostros

---

### 2️⃣ **Analizar Post Existente**
```
GET http://localhost:4000/api/face-detection/test/analyze/:postId
```

**Ejemplo:**
```
GET http://localhost:4000/api/face-detection/test/analyze/1
```

---

### 3️⃣ **Obtener Análisis Cacheado**
```
GET http://localhost:4000/api/face-detection/test/analyze/:postId/cached
```

**Ejemplo:**
```
GET http://localhost:4000/api/face-detection/test/analyze/1/cached
```

---

## 🔧 **Cómo Probar en Postman**

### **Paso 1: Analizar una Imagen Nueva**

1. **Abrir Postman**
2. **Nueva Request**:
   - Method: `POST`
   - URL: `http://localhost:4000/api/face-detection/test/analyze`
3. **Body**:
   - Seleccionar `form-data`
   - Key: `image` 
   - Cambiar tipo a **File** (hay un dropdown a la derecha)
   - Value: Click en "Select Files" y elegir una imagen con rostros
4. **Send** ✅

**Respuesta esperada:**
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
        "landmarks": { "total": 68, ... },
        "expressions": {
          "happy": 75,
          "neutral": 15,
          "dominant": { "expression": "happy", "probability": 75 }
        },
        "age": 28,
        "gender": "female",
        "genderConfidence": 92
      }
    ],
    "timestamp": "2025-11-02T10:30:00.000Z"
  }
}
```

---

### **Paso 2: Analizar un Post Existente (Opcional)**

Si tienes posts en tu base de datos con imágenes:

1. **Nueva Request**:
   - Method: `GET`
   - URL: `http://localhost:4000/api/face-detection/test/analyze/1`
2. **Send** ✅

**Nota:** Esto solo funciona si:
- El post ID existe en la base de datos
- El post tiene una imagen en `imagen_url`
- La imagen es accesible (filesystem o URL)

---

## 🖼️ **Preparar Imagen de Prueba**

### Opción 1: Usar imagen de internet
Descarga una imagen con rostros visibles de Google Images

### Opción 2: Usar tu propia foto
Cualquier foto tuya o de otras personas (con permiso)

### Requisitos:
- ✅ Formato: JPEG, PNG, WEBP, GIF
- ✅ Tamaño: Máximo 10 MB
- ✅ Contenido: Al menos un rostro visible
- ✅ Calidad: Buena iluminación y rostro frontal (mejor detección)

---

## 💡 **Ejemplos de Uso con cURL (PowerShell)**

### Analizar Imagen
```powershell
$imagePath = "C:\ruta\a\tu\imagen.jpg"

# Crear FormData
$form = @{
    image = Get-Item -Path $imagePath
}

# Enviar request
Invoke-RestMethod -Uri "http://localhost:4000/api/face-detection/test/analyze" `
  -Method POST `
  -Form $form | ConvertTo-Json -Depth 10
```

### Analizar Post
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/face-detection/test/analyze/1" `
  -Method GET | ConvertTo-Json -Depth 10
```

---

## 📊 **Qué Verás en la Respuesta**

### Si detecta rostros:
```json
{
  "success": true,
  "analysis": {
    "hasFaces": true,
    "faceCount": 2,
    "faces": [
      {
        "id": 0,
        "boundingBox": {...},      // Ubicación del rostro
        "landmarks": {...},         // 68 puntos faciales
        "expressions": {
          "happy": 75,              // 75% feliz
          "sad": 5,                 // 5% triste
          "dominant": {
            "expression": "happy",
            "probability": 75
          }
        },
        "age": 28,                  // ~28 años
        "gender": "female",         // Mujer
        "genderConfidence": 92      // 92% seguro
      },
      {
        "id": 1,
        // Segundo rostro...
      }
    ]
  }
}
```

### Si NO detecta rostros:
```json
{
  "success": true,
  "analysis": {
    "hasFaces": false,
    "faceCount": 0,
    "faces": [],
    "timestamp": "2025-11-02T10:30:00.000Z"
  }
}
```

---

## 🐛 **Solución de Problemas**

### Error: "No image provided"
```json
{"error": "No image provided"}
```
**Solución:** Asegúrate de que el campo se llama `image` y es de tipo File.

### Error: "Solo se permiten archivos de imagen"
```json
{"error": "Solo se permiten archivos de imagen (JPEG, PNG, WEBP, GIF)"}
```
**Solución:** Usa un archivo de imagen válido (no PDF, no Word, etc.)

### Error 500 - "Error al analizar la imagen"
```json
{"success": false, "error": "Error al analizar la imagen"}
```
**Soluciones:**
1. Verifica que el servidor esté corriendo
2. Verifica que los modelos ML estén cargados (ver consola del servidor)
3. Prueba con otra imagen más simple (un solo rostro, buena iluminación)

---

## ⚡ **Verificar que el Servidor Esté Listo**

En la consola del servidor deberías ver:
```
✅ Todos los modelos cargados exitosamente
✅ Modelos de face-api.js cargados exitosamente
🚀 Servidor corriendo en puerto 4000
```

Si no ves esto, reinicia el servidor:
```powershell
# Detener servidor (Ctrl+C)
# Iniciar de nuevo
npm run dev
```

---

## 🔐 **Rutas Protegidas (Requieren Auth)**

Las rutas originales siguen disponibles pero requieren token:
```
POST /api/face-detection/analyze           (Requiere: Bearer Token)
GET  /api/face-detection/analyze/:postId   (Requiere: Bearer Token)
GET  /api/face-detection/analyze/:postId/cached (Requiere: Bearer Token)
```

---

## 🗑️ **Eliminar Rutas de Prueba en Producción**

Cuando termines de probar, elimina estas líneas en `routes/faceDetection.routes.js`:

```javascript
// ELIMINAR ESTAS 3 LÍNEAS:
router.post('/test/analyze', upload.single('image'), analyzeUploadedImage);
router.get('/test/analyze/:postId', analyzePostImage);
router.get('/test/analyze/:postId/cached', getCachedAnalysis);
```

---

## ✅ **Checklist de Prueba**

- [ ] Servidor corriendo en puerto 4000
- [ ] Modelos ML cargados (ver consola)
- [ ] Imagen de prueba lista (con rostros visibles)
- [ ] Postman abierto
- [ ] Request configurada: POST + form-data + file
- [ ] ¡Send! 🚀

---

## 🎉 **¡Listo para Probar!**

Usa la URL de prueba:
```
POST http://localhost:4000/api/face-detection/test/analyze
```

**Sin headers**, **sin token**, solo la imagen en form-data. 

¡Debería funcionar! 🎭✨
