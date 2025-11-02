// services/faceDetection.service.js
import * as faceapi from 'face-api.js';
import canvas from 'canvas';
import '@tensorflow/tfjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurar canvas para face-api.js en Node.js
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;
const MODELS_PATH = join(__dirname, '..', 'ml-models', 'face-api');

/**
 * Carga todos los modelos necesarios de face-api.js
 */
export async function loadModels() {
  if (modelsLoaded) {
    console.log('✅ Modelos ya están cargados');
    return;
  }

  try {
    console.log('📦 Cargando modelos de face-api.js desde:', MODELS_PATH);
    
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH),
      faceapi.nets.tinyFaceDetector.loadFromDisk(MODELS_PATH),
      faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH),
      faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH),
      faceapi.nets.faceExpressionNet.loadFromDisk(MODELS_PATH),
      faceapi.nets.ageGenderNet.loadFromDisk(MODELS_PATH),
    ]);

    modelsLoaded = true;
    console.log('✅ Todos los modelos cargados exitosamente');
  } catch (error) {
    console.error('❌ Error cargando modelos:', error);
    throw new Error(`No se pudieron cargar los modelos: ${error.message}`);
  }
}

/**
 * Analiza una imagen y detecta rostros con todas las características
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @returns {Promise<Object>} - Análisis completo
 */
export async function analyzeImage(imageBuffer) {
  if (!modelsLoaded) {
    await loadModels();
  }

  try {
    // Cargar imagen desde buffer
    const img = await canvas.loadImage(imageBuffer);
    
    // Detectar rostros con todas las características
    const detections = await faceapi
      .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender();

    if (!detections || detections.length === 0) {
      return {
        success: true,
        analysis: {
          hasFaces: false,
          faceCount: 0,
          faces: [],
          timestamp: new Date().toISOString()
        }
      };
    }

    // Procesar cada rostro detectado
    const faces = detections.map((detection, index) => {
      const box = detection.detection.box;
      const landmarks = detection.landmarks;
      const expressions = detection.expressions;
      const { age, gender, genderProbability } = detection;

      // Encontrar expresión dominante
      const expressionsArray = Object.entries(expressions).map(([name, value]) => ({
        expression: name,
        probability: Math.round(value * 100)
      }));
      
      const dominant = expressionsArray.reduce((max, curr) => 
        curr.probability > max.probability ? curr : max
      );

      return {
        id: index,
        boundingBox: {
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height)
        },
        landmarks: {
          // 68 puntos faciales organizados por región
          jawOutline: landmarks.getJawOutline().map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })),
          leftEyebrow: landmarks.getLeftEyeBrow().map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })),
          rightEyebrow: landmarks.getRightEyeBrow().map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })),
          noseBridge: landmarks.getNose().map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })),
          leftEye: landmarks.getLeftEye().map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })),
          rightEye: landmarks.getRightEye().map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })),
          mouth: landmarks.getMouth().map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })),
          total: landmarks.positions.length
        },
        expressions: {
          neutral: Math.round(expressions.neutral * 100),
          happy: Math.round(expressions.happy * 100),
          sad: Math.round(expressions.sad * 100),
          angry: Math.round(expressions.angry * 100),
          fearful: Math.round(expressions.fearful * 100),
          disgusted: Math.round(expressions.disgusted * 100),
          surprised: Math.round(expressions.surprised * 100),
          dominant: {
            expression: dominant.expression,
            probability: dominant.probability
          }
        },
        age: Math.round(age),
        gender: gender,
        genderConfidence: Math.round(genderProbability * 100)
      };
    });

    return {
      success: true,
      analysis: {
        hasFaces: true,
        faceCount: faces.length,
        faces,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('❌ Error en análisis facial:', error);
    throw new Error(`Error analizando imagen: ${error.message}`);
  }
}

/**
 * Analiza una imagen desde una URL
 * @param {string} imageUrl - URL de la imagen
 * @returns {Promise<Object>} - Análisis completo
 */
export async function analyzeImageFromUrl(imageUrl) {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const imageBuffer = Buffer.from(response.data);
    return await analyzeImage(imageBuffer);
  } catch (error) {
    console.error('❌ Error descargando imagen:', error);
    throw new Error(`Error descargando imagen: ${error.message}`);
  }
}

/**
 * Valida si un archivo es una imagen válida
 * @param {Object} file - Archivo multer
 * @returns {boolean}
 */
export function isValidImageFile(file) {
  if (!file) return false;
  
  const validMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
  ];

  return validMimeTypes.includes(file.mimetype);
}

/**
 * Valida el tamaño del archivo
 * @param {Object} file - Archivo multer
 * @param {number} maxSizeMB - Tamaño máximo en MB
 * @returns {boolean}
 */
export function isValidFileSize(file, maxSizeMB = 10) {
  if (!file) return false;
  const maxBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxBytes;
}

export default {
  loadModels,
  analyzeImage,
  analyzeImageFromUrl,
  isValidImageFile,
  isValidFileSize
};
