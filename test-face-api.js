// test-face-api.js
// Script de prueba para la API de detección facial
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_URL = 'http://localhost:4000';
let authToken = '';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(color, message) {
  console.log(color + message + colors.reset);
}

// 1. Login para obtener token
async function login(email, password) {
  try {
    log(colors.blue, '\n🔐 Intentando login...');
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email,
      password
    });
    
    authToken = response.data.token;
    log(colors.green, '✅ Login exitoso');
    log(colors.gray, `Token: ${authToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    log(colors.red, '❌ Error en login');
    if (error.response) {
      log(colors.red, `Error: ${error.response.data.error || error.message}`);
    } else {
      log(colors.red, `Error: ${error.message}`);
    }
    return false;
  }
}

// 2. Analizar imagen desde archivo
async function analyzeImageFile(imagePath) {
  try {
    log(colors.blue, `\n🖼️  Analizando imagen: ${imagePath}`);
    
    if (!fs.existsSync(imagePath)) {
      log(colors.red, '❌ Archivo no encontrado');
      log(colors.yellow, '💡 Coloca una imagen en la raíz del proyecto y actualiza la ruta');
      return;
    }

    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));

    const response = await axios.post(
      `${API_URL}/api/face-detection/analyze`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${authToken}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    const result = response.data;
    
    log(colors.green, '\n✅ Análisis completado');
    log(colors.blue, '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log(colors.yellow, `📊 RESULTADOS:`);
    log(colors.gray, `   Tiene rostros: ${result.analysis.hasFaces ? '✅ Sí' : '❌ No'}`);
    log(colors.gray, `   Cantidad de rostros: ${result.analysis.faceCount}`);
    
    if (result.analysis.hasFaces) {
      result.analysis.faces.forEach((face, index) => {
        log(colors.blue, `\n   👤 Rostro ${index + 1}:`);
        log(colors.gray, `      📍 Posición: (${face.boundingBox.x}, ${face.boundingBox.y})`);
        log(colors.gray, `      📐 Tamaño: ${face.boundingBox.width}x${face.boundingBox.height}`);
        log(colors.gray, `      🎭 Expresión: ${face.expressions.dominant.expression} (${face.expressions.dominant.probability}%)`);
        log(colors.gray, `      🎂 Edad: ~${face.age} años`);
        log(colors.gray, `      ⚧️  Género: ${face.gender} (${face.genderConfidence}% confianza)`);
        log(colors.gray, `      📍 Landmarks: ${face.landmarks.total} puntos`);
        
        log(colors.yellow, `\n      📊 Expresiones detalladas:`);
        Object.entries(face.expressions).forEach(([expr, prob]) => {
          if (expr !== 'dominant') {
            const bar = '█'.repeat(Math.floor(prob / 5));
            log(colors.gray, `         ${expr.padEnd(10)}: ${bar} ${prob}%`);
          }
        });
      });
    }
    
    log(colors.blue, '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    log(colors.gray, `⏰ Timestamp: ${result.analysis.timestamp}`);
    
  } catch (error) {
    log(colors.red, '\n❌ Error analizando imagen');
    if (error.response) {
      log(colors.red, `Error: ${error.response.data.error || error.message}`);
      if (error.response.data.details) {
        log(colors.gray, `Detalles: ${error.response.data.details}`);
      }
    } else {
      log(colors.red, `Error: ${error.message}`);
    }
  }
}

// 3. Analizar un post existente
async function analyzePost(postId) {
  try {
    log(colors.blue, `\n📝 Analizando post ID: ${postId}`);
    
    const response = await axios.get(
      `${API_URL}/api/face-detection/analyze/${postId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    const result = response.data;
    
    log(colors.green, '✅ Post analizado exitosamente');
    log(colors.gray, `   Rostros detectados: ${result.analysis.faceCount}`);
    log(colors.gray, `   Cacheado: ${result.cached ? '✅' : '❌'}`);
    log(colors.gray, `   Analizado: ${result.analyzedAt}`);
    
    if (result.analysis.hasFaces) {
      result.analysis.faces.forEach((face, index) => {
        log(colors.blue, `\n   👤 Rostro ${index + 1}:`);
        log(colors.gray, `      🎭 ${face.expressions.dominant.expression} (${face.expressions.dominant.probability}%)`);
        log(colors.gray, `      🎂 ${face.age} años | ⚧️ ${face.gender} (${face.genderConfidence}%)`);
      });
    }
    
  } catch (error) {
    log(colors.red, '\n❌ Error analizando post');
    if (error.response) {
      log(colors.red, `Error: ${error.response.data.error || error.message}`);
    } else {
      log(colors.red, `Error: ${error.message}`);
    }
  }
}

// 4. Obtener análisis cacheado
async function getCachedAnalysis(postId) {
  try {
    log(colors.blue, `\n💾 Obteniendo análisis cacheado del post ${postId}`);
    
    const response = await axios.get(
      `${API_URL}/api/face-detection/analyze/${postId}/cached`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    const result = response.data;
    
    log(colors.green, '✅ Análisis cacheado encontrado');
    log(colors.gray, `   Rostros: ${result.analysis.faceCount}`);
    log(colors.gray, `   Analizado: ${result.analyzedAt}`);
    
  } catch (error) {
    if (error.response && error.response.status === 404) {
      log(colors.yellow, '⚠️  No existe análisis cacheado para este post');
      log(colors.gray, '   Usa el endpoint /analyze/:postId para crear uno nuevo');
    } else {
      log(colors.red, '❌ Error obteniendo análisis cacheado');
      if (error.response) {
        log(colors.red, `Error: ${error.response.data.error || error.message}`);
      } else {
        log(colors.red, `Error: ${error.message}`);
      }
    }
  }
}

// Menú de pruebas
async function main() {
  log(colors.blue, '╔════════════════════════════════════════════════════╗');
  log(colors.blue, '║   🎭 TEST FACE DETECTION API - face-api.js      ║');
  log(colors.blue, '╚════════════════════════════════════════════════════╝');
  
  // Configuración de prueba
  const TEST_EMAIL = 'test@example.com'; // ⚠️ CAMBIA ESTO
  const TEST_PASSWORD = 'password123';    // ⚠️ CAMBIA ESTO
  const TEST_IMAGE = 'test-image.jpg';    // ⚠️ Coloca una imagen en la raíz
  const TEST_POST_ID = 1;                 // ⚠️ ID de un post con imagen
  
  log(colors.yellow, '\n⚠️  CONFIGURACIÓN DE PRUEBA:');
  log(colors.gray, `   Email: ${TEST_EMAIL}`);
  log(colors.gray, `   Imagen: ${TEST_IMAGE}`);
  log(colors.gray, `   Post ID: ${TEST_POST_ID}`);
  log(colors.yellow, '\n💡 Edita estas variables en test-face-api.js\n');
  
  // 1. Login
  const loginSuccess = await login(TEST_EMAIL, TEST_PASSWORD);
  if (!loginSuccess) {
    log(colors.red, '\n❌ No se pudo continuar sin autenticación');
    log(colors.yellow, '💡 Verifica las credenciales en el script');
    process.exit(1);
  }
  
  // Esperar un poco
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 2. Analizar imagen desde archivo
  await analyzeImageFile(TEST_IMAGE);
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 3. Analizar post existente
  await analyzePost(TEST_POST_ID);
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 4. Obtener análisis cacheado
  await getCachedAnalysis(TEST_POST_ID);
  
  log(colors.green, '\n\n✅ Pruebas completadas');
  log(colors.blue, '╚════════════════════════════════════════════════════╝\n');
}

// Ejecutar
main().catch(error => {
  log(colors.red, '\n❌ Error en pruebas:', error.message);
  process.exit(1);
});
