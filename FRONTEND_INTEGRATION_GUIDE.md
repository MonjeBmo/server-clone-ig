# 🎨 Guía de Integración Frontend - Face Detection API

## 📋 Tabla de Contenidos
1. [Endpoints Disponibles](#endpoints-disponibles)
2. [Ejemplos de Integración](#ejemplos-de-integración)
3. [Tipos TypeScript](#tipos-typescript)
4. [Componentes React](#componentes-react)
5. [Visualización de Landmarks](#visualización-de-landmarks)
6. [Manejo de Estados](#manejo-de-estados)

---

## 🔌 Endpoints Disponibles

### Base URL
```
https://tu-dominio-railway.up.railway.app/api/face-detection
```

### 1. Analizar Imagen Subida por el Usuario
```http
POST /api/face-detection/analyze
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body:
  image: [File]
```

**Uso**: Cuando el usuario sube una nueva imagen (antes o después de crear el post)

---

### 2. Analizar Post Existente
```http
GET /api/face-detection/analyze/{postId}
Authorization: Bearer {token}
```

**Uso**: Para analizar un post que ya existe en la base de datos

---

### 3. Obtener Análisis Cacheado
```http
GET /api/face-detection/analyze/{postId}/cached
Authorization: Bearer {token}
```

**Uso**: Para obtener análisis previamente guardado (respuesta instantánea)

---

## 💻 Ejemplos de Integración

### JavaScript Vanilla / Fetch API

```javascript
// 1. Analizar imagen al subirla
async function analyzeFaceOnUpload(imageFile, token) {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await fetch('https://tu-api.railway.app/api/face-detection/analyze', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  const data = await response.json();
  return data;
}

// 2. Analizar post existente
async function analyzePost(postId, token) {
  const response = await fetch(
    `https://tu-api.railway.app/api/face-detection/analyze/${postId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();
  return data;
}

// 3. Obtener análisis cacheado
async function getCachedAnalysis(postId, token) {
  const response = await fetch(
    `https://tu-api.railway.app/api/face-detection/analyze/${postId}/cached`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();
  return data;
}
```

---

### Axios

```javascript
import axios from 'axios';

const API_BASE = 'https://tu-api.railway.app/api/face-detection';

// Configurar interceptor con token
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});

// 1. Analizar imagen
export const analyzeFaceImage = async (imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const { data } = await api.post('/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  
  return data;
};

// 2. Analizar post
export const analyzePostImage = async (postId) => {
  const { data } = await api.get(`/analyze/${postId}`);
  return data;
};

// 3. Obtener caché
export const getCachedFaceAnalysis = async (postId) => {
  const { data } = await api.get(`/analyze/${postId}/cached`);
  return data;
};
```

---

## 📘 Tipos TypeScript

```typescript
// types/faceDetection.ts

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Landmarks {
  jawOutline: Point[];
  leftEyebrow: Point[];
  rightEyebrow: Point[];
  noseBridge: Point[];
  leftEye: Point[];
  rightEye: Point[];
  mouth: Point[];
  total: number; // Siempre 68
}

export interface Expression {
  neutral: number;
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
  dominant: {
    expression: 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised';
    probability: number;
  };
}

export interface Face {
  id: number;
  boundingBox: BoundingBox;
  landmarks: Landmarks;
  expressions: Expression;
  age: number;
  gender: 'male' | 'female';
  genderConfidence: number;
}

export interface FaceAnalysis {
  hasFaces: boolean;
  faceCount: number;
  faces: Face[];
  timestamp: string;
}

export interface FaceAnalysisResponse {
  success: boolean;
  analysis: FaceAnalysis;
  postId?: number;
  cached?: boolean;
  analyzedAt?: string;
}

export interface FaceAnalysisError {
  success: false;
  error: string;
  details?: string;
}
```

---

## ⚛️ Componentes React

### 1. Hook Personalizado - useFaceDetection

```typescript
// hooks/useFaceDetection.ts
import { useState } from 'react';
import { analyzeFaceImage, analyzePostImage, getCachedFaceAnalysis } from '../services/faceDetection';
import type { FaceAnalysisResponse } from '../types/faceDetection';

export const useFaceDetection = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FaceAnalysisResponse | null>(null);

  const analyzeImage = async (imageFile: File) => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeFaceImage(imageFile);
      setAnalysis(result);
      return result;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al analizar imagen');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const analyzePost = async (postId: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzePostImage(postId);
      setAnalysis(result);
      return result;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al analizar post');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getCached = async (postId: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCachedFaceAnalysis(postId);
      setAnalysis(result);
      return result;
    } catch (err: any) {
      // Si no hay caché, analizar
      if (err.response?.status === 404) {
        return await analyzePost(postId);
      }
      setError(err.response?.data?.error || 'Error al obtener análisis');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    analysis,
    analyzeImage,
    analyzePost,
    getCached
  };
};
```

---

### 2. Componente - FaceAnalysisCard

```tsx
// components/FaceAnalysisCard.tsx
import React from 'react';
import type { Face } from '../types/faceDetection';

interface Props {
  face: Face;
  index: number;
}

export const FaceAnalysisCard: React.FC<Props> = ({ face, index }) => {
  const { expressions, age, gender, genderConfidence } = face;
  const dominantExpression = expressions.dominant;

  // Emojis para expresiones
  const expressionEmojis = {
    neutral: '😐',
    happy: '😊',
    sad: '😢',
    angry: '😠',
    fearful: '😨',
    disgusted: '🤢',
    surprised: '😮'
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <h3 className="text-lg font-semibold mb-3">
        Cara #{index + 1}
      </h3>
      
      {/* Expresión dominante */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-3xl">
          {expressionEmojis[dominantExpression.expression]}
        </span>
        <div>
          <p className="font-medium capitalize">{dominantExpression.expression}</p>
          <p className="text-sm text-gray-600">
            {dominantExpression.probability}% de confianza
          </p>
        </div>
      </div>

      {/* Todas las expresiones */}
      <div className="mb-3">
        <p className="text-sm font-medium mb-2">Todas las expresiones:</p>
        <div className="space-y-1">
          {Object.entries(expressions)
            .filter(([key]) => key !== 'dominant')
            .map(([expression, value]) => (
              <div key={expression} className="flex items-center gap-2">
                <span className="text-xs">{expressionEmojis[expression as keyof typeof expressionEmojis]}</span>
                <span className="text-sm capitalize flex-1">{expression}</span>
                <span className="text-sm font-medium">{value}%</span>
                <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500"
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Edad y género */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t">
        <div>
          <p className="text-xs text-gray-500">Edad estimada</p>
          <p className="text-lg font-semibold">{age} años</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Género</p>
          <p className="text-lg font-semibold capitalize">
            {gender === 'male' ? 'Masculino' : 'Femenino'}
            <span className="text-sm text-gray-600 ml-1">
              ({genderConfidence}%)
            </span>
          </p>
        </div>
      </div>

      {/* Landmarks */}
      <div className="mt-3 pt-3 border-t">
        <p className="text-xs text-gray-500">
          68 puntos faciales detectados
        </p>
      </div>
    </div>
  );
};
```

---

### 3. Componente - FaceDetectionButton

```tsx
// components/FaceDetectionButton.tsx
import React from 'react';
import { useFaceDetection } from '../hooks/useFaceDetection';

interface Props {
  postId: number;
  onAnalysisComplete?: (analysis: any) => void;
}

export const FaceDetectionButton: React.FC<Props> = ({ postId, onAnalysisComplete }) => {
  const { loading, error, getCached } = useFaceDetection();

  const handleAnalyze = async () => {
    try {
      const result = await getCached(postId);
      onAnalysisComplete?.(result);
    } catch (err) {
      console.error('Error al analizar:', err);
    }
  };

  return (
    <div>
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Analizando...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Detectar Rostros</span>
          </>
        )}
      </button>
      
      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
    </div>
  );
};
```

---

### 4. Componente - FaceLandmarksCanvas

```tsx
// components/FaceLandmarksCanvas.tsx
import React, { useEffect, useRef } from 'react';
import type { Face } from '../types/faceDetection';

interface Props {
  imageUrl: string;
  faces: Face[];
  width?: number;
  height?: number;
}

export const FaceLandmarksCanvas: React.FC<Props> = ({ 
  imageUrl, 
  faces, 
  width = 600, 
  height = 600 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      // Dibujar imagen
      ctx.drawImage(img, 0, 0, width, height);

      // Dibujar landmarks para cada cara
      faces.forEach((face, faceIndex) => {
        const { boundingBox, landmarks } = face;

        // Dibujar bounding box
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 3;
        ctx.strokeRect(
          boundingBox.x,
          boundingBox.y,
          boundingBox.width,
          boundingBox.height
        );

        // Dibujar número de cara
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(
          `#${faceIndex + 1}`,
          boundingBox.x,
          boundingBox.y - 10
        );

        // Dibujar landmarks
        const drawLandmarks = (points: any[], color: string, size = 2) => {
          ctx.fillStyle = color;
          points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, size, 0, 2 * Math.PI);
            ctx.fill();
          });
        };

        // Colores diferentes para cada región
        drawLandmarks(landmarks.jawOutline, '#FF0000', 2);     // Rojo - contorno
        drawLandmarks(landmarks.leftEyebrow, '#00FFFF', 2);    // Cyan - ceja izq
        drawLandmarks(landmarks.rightEyebrow, '#00FFFF', 2);   // Cyan - ceja der
        drawLandmarks(landmarks.noseBridge, '#FFFF00', 2);     // Amarillo - nariz
        drawLandmarks(landmarks.leftEye, '#FF00FF', 3);        // Magenta - ojo izq
        drawLandmarks(landmarks.rightEye, '#FF00FF', 3);       // Magenta - ojo der
        drawLandmarks(landmarks.mouth, '#FFA500', 2);          // Naranja - boca
      });
    };
  }, [imageUrl, faces, width, height]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-300 rounded-lg"
      />
      <div className="mt-2 text-xs text-gray-600">
        <p>🔴 Rojo: Contorno facial | 🔵 Cyan: Cejas</p>
        <p>💛 Amarillo: Nariz | 💜 Magenta: Ojos | 🟠 Naranja: Boca</p>
      </div>
    </div>
  );
};
```

---

### 5. Página Completa - Ejemplo de Uso

```tsx
// pages/PostDetailWithFaceDetection.tsx
import React, { useState, useEffect } from 'react';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { FaceAnalysisCard } from '../components/FaceAnalysisCard';
import { FaceLandmarksCanvas } from '../components/FaceLandmarksCanvas';
import { FaceDetectionButton } from '../components/FaceDetectionButton';

interface Props {
  postId: number;
  imageUrl: string;
}

export const PostDetailWithFaceDetection: React.FC<Props> = ({ postId, imageUrl }) => {
  const { loading, error, analysis, getCached } = useFaceDetection();
  const [showLandmarks, setShowLandmarks] = useState(false);

  useEffect(() => {
    // Intentar obtener análisis cacheado al cargar
    getCached(postId).catch(() => {
      // Si no hay caché, no hacer nada (el usuario puede hacer clic en el botón)
    });
  }, [postId]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Imagen del post */}
      <div className="mb-6">
        <img 
          src={imageUrl} 
          alt="Post" 
          className="w-full rounded-lg shadow-lg"
        />
      </div>

      {/* Botón de análisis */}
      <div className="mb-6">
        <FaceDetectionButton 
          postId={postId}
          onAnalysisComplete={(result) => console.log('Análisis completo:', result)}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">Analizando rostros...</p>
            <p className="text-sm text-gray-500">Esto puede tomar 30-40 segundos</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Resultados */}
      {analysis && analysis.success && (
        <div className="space-y-6">
          {/* Resumen */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="text-xl font-bold mb-2">
              {analysis.analysis.hasFaces 
                ? `✅ ${analysis.analysis.faceCount} ${analysis.analysis.faceCount === 1 ? 'rostro detectado' : 'rostros detectados'}`
                : '❌ No se detectaron rostros'}
            </h2>
            {analysis.cached && (
              <p className="text-sm text-blue-600">
                ⚡ Análisis cacheado (instantáneo)
              </p>
            )}
            {analysis.analyzedAt && (
              <p className="text-sm text-gray-600">
                Analizado: {new Date(analysis.analyzedAt).toLocaleString('es-MX')}
              </p>
            )}
          </div>

          {/* Caras detectadas */}
          {analysis.analysis.hasFaces && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.analysis.faces.map((face, index) => (
                  <FaceAnalysisCard 
                    key={index}
                    face={face}
                    index={index}
                  />
                ))}
              </div>

              {/* Toggle para landmarks */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowLandmarks(!showLandmarks)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  {showLandmarks ? 'Ocultar' : 'Mostrar'} Puntos Faciales (68 landmarks)
                </button>
              </div>

              {/* Visualización de landmarks */}
              {showLandmarks && (
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">
                    Visualización de Landmarks
                  </h3>
                  <FaceLandmarksCanvas
                    imageUrl={imageUrl}
                    faces={analysis.analysis.faces}
                    width={800}
                    height={600}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
```

---

## 🎨 Estilos CSS (Tailwind)

Si no usas Tailwind, aquí están los estilos equivalentes en CSS:

```css
/* styles/faceDetection.css */

.face-analysis-card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  border: 1px solid #e5e7eb;
}

.expression-bar {
  width: 5rem;
  height: 0.5rem;
  background: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
}

.expression-bar-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.3s;
}

.loading-spinner {
  animation: spin 1s linear infinite;
  border-radius: 50%;
  width: 3rem;
  height: 3rem;
  border: 2px solid transparent;
  border-top-color: #7c3aed;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

## 📱 Flujo de Trabajo Recomendado

### Opción 1: Análisis en tiempo real al subir post
```typescript
// Al crear un post con imagen
async function createPostWithFaceDetection(imageFile: File, description: string) {
  // 1. Crear el post normalmente
  const post = await createPost(imageFile, description);
  
  // 2. Analizar rostros en segundo plano
  analyzeFaceImage(imageFile)
    .then(analysis => {
      console.log('Análisis completado:', analysis);
      // Opcional: mostrar notificación al usuario
    })
    .catch(err => {
      console.error('Error en análisis:', err);
      // No bloquear la creación del post si falla
    });
  
  return post;
}
```

### Opción 2: Análisis bajo demanda
```typescript
// Mostrar botón "Detectar Rostros" en cada post
// El usuario hace clic cuando quiere ver el análisis
<FaceDetectionButton 
  postId={post.id}
  onAnalysisComplete={(analysis) => {
    // Mostrar resultados en un modal o sección expandible
    setShowAnalysis(true);
    setAnalysisData(analysis);
  }}
/>
```

### Opción 3: Pre-análisis de todos los posts
```typescript
// Ejecutar una vez para analizar todos los posts sin análisis
async function analyzAllPosts() {
  const posts = await getAllPosts();
  
  for (const post of posts) {
    try {
      // Intentar obtener caché, si no existe, analizar
      await getCachedFaceAnalysis(post.id);
    } catch (err) {
      // Post sin análisis, analizarlo
      await analyzePostImage(post.id);
    }
    
    // Esperar un poco entre análisis para no saturar el servidor
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
```

---

## 🎯 Estados de UI

```typescript
// Diferentes estados a manejar en el frontend

enum AnalysisState {
  IDLE = 'idle',                    // Sin analizar
  LOADING = 'loading',              // Analizando (30-40s)
  SUCCESS = 'success',              // Análisis completo
  NO_FACES = 'no_faces',            // Sin rostros detectados
  ERROR = 'error',                  // Error en análisis
  CACHED = 'cached'                 // Obtenido de caché
}
```

---

## 🚀 Optimizaciones

1. **Caché Local (LocalStorage/IndexedDB)**
```typescript
// Guardar análisis en localStorage para no hacer peticiones repetidas
const cacheKey = `face_analysis_${postId}`;
const cached = localStorage.getItem(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const analysis = await analyzePost(postId);
localStorage.setItem(cacheKey, JSON.stringify(analysis));
```

2. **Lazy Loading**
```typescript
// Solo analizar cuando el post sea visible
import { useInView } from 'react-intersection-observer';

const { ref, inView } = useInView({ triggerOnce: true });

useEffect(() => {
  if (inView) {
    getCached(postId);
  }
}, [inView, postId]);
```

---

## 📊 Respuestas de la API

### Éxito - Con Rostros
```json
{
  "success": true,
  "analysis": {
    "hasFaces": true,
    "faceCount": 1,
    "faces": [
      {
        "id": 0,
        "boundingBox": { "x": 690, "y": 394, "width": 278, "height": 388 },
        "landmarks": {
          "jawOutline": [{ "x": 711, "y": 499 }, ...],
          "leftEyebrow": [...],
          "rightEyebrow": [...],
          "noseBridge": [...],
          "leftEye": [...],
          "rightEye": [...],
          "mouth": [...],
          "total": 68
        },
        "expressions": {
          "neutral": 53,
          "happy": 43,
          "sad": 2,
          "angry": 0,
          "fearful": 0,
          "disgusted": 1,
          "surprised": 0,
          "dominant": { "expression": "neutral", "probability": 53 }
        },
        "age": 24,
        "gender": "female",
        "genderConfidence": 55
      }
    ],
    "timestamp": "2025-11-02T07:27:09.494Z"
  },
  "postId": 15,
  "cached": false,
  "analyzedAt": "2025-11-02T13:27:09.504Z"
}
```

### Éxito - Sin Rostros
```json
{
  "success": true,
  "analysis": {
    "hasFaces": false,
    "faceCount": 0,
    "faces": [],
    "timestamp": "2025-11-02T07:27:09.494Z"
  }
}
```

### Error
```json
{
  "success": false,
  "error": "Post no encontrado"
}
```

---

## ✅ Checklist de Integración

- [ ] Agregar endpoints a tu archivo de servicios/API
- [ ] Crear tipos TypeScript para las respuestas
- [ ] Implementar hook `useFaceDetection`
- [ ] Crear componentes de UI (cards, canvas, botones)
- [ ] Agregar botón "Detectar Rostros" en posts
- [ ] Mostrar loading state (30-40 segundos)
- [ ] Manejar errores (sin token, post no existe, etc.)
- [ ] Implementar caché local (opcional)
- [ ] Agregar visualización de landmarks (opcional)
- [ ] Probar con posts reales en producción

---

## 🆘 Soporte y Troubleshooting

### Error: "No se pudo resolver la URL de la imagen"
- El post tiene una URL legacy `/uploads/...`
- Solo funciona con posts que tienen imágenes en S3

### Error: "Post no encontrado"
- Verifica que el `postId` sea correcto
- Asegúrate de que el post existe en la base de datos

### Error: "Unauthorized"
- Verifica que el token JWT esté presente en headers
- Asegúrate de que el token no haya expirado

### La primera petición toma mucho tiempo
- Normal: 30-40 segundos para cargar modelos ML
- Las siguientes peticiones son más rápidas
- Muestra un loading spinner al usuario

---

¡Listo! Con esta guía tu equipo de frontend puede integrar completamente el sistema de detección facial 🎉
