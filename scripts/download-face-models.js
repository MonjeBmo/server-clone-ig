// scripts/download-face-models.js
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MODELS_DIR = path.join(__dirname, '..', 'ml-models', 'face-api');
const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

// Modelos necesarios según los requisitos
const MODELS = [
  // SSD MobileNet V1 (detector de rostros robusto)
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  
  // Tiny Face Detector (detector ligero)
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  
  // Face Landmark 68 points
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  
  // Face Recognition
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
  
  // Face Expression
  'face_expression_model-weights_manifest.json',
  'face_expression_model-shard1',
  
  // Age and Gender
  'age_gender_model-weights_manifest.json',
  'age_gender_model-shard1'
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else if (response.statusCode === 404) {
        fs.unlink(dest, () => {});
        reject(new Error(`404: File not found - ${url}`));
      } else {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function downloadModels() {
  console.log('📦 Descargando modelos de face-api.js...\n');

  // Crear directorio si no existe
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
    console.log(`✅ Directorio creado: ${MODELS_DIR}\n`);
  }

  let downloaded = 0;
  let skipped = 0;
  let errors = 0;

  for (const model of MODELS) {
    const url = `${BASE_URL}/${model}`;
    const dest = path.join(MODELS_DIR, model);

    try {
      // Verificar si ya existe
      if (fs.existsSync(dest)) {
        console.log(`⏭️  Ya existe: ${model}`);
        skipped++;
        continue;
      }

      console.log(`⬇️  Descargando: ${model}...`);
      await downloadFile(url, dest);
      console.log(`✅ Completado: ${model}`);
      downloaded++;
    } catch (error) {
      console.error(`❌ Error descargando ${model}:`, error.message);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Resumen:`);
  console.log(`   ✅ Archivos descargados: ${downloaded}`);
  console.log(`   ⏭️  Archivos existentes: ${skipped}`);
  if (errors > 0) {
    console.log(`   ❌ Errores: ${errors}`);
  }
  console.log('='.repeat(50));

  if (errors === 0) {
    console.log('\n🎉 ¡Todos los modelos están listos para usar!');
    console.log(`📁 Ubicación: ${MODELS_DIR}`);
  } else {
    console.log('\n⚠️  Algunos modelos no se pudieron descargar');
    process.exit(1);
  }
}

// Ejecutar
downloadModels().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
