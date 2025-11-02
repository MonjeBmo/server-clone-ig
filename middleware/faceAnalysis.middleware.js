// middleware/faceAnalysis.middleware.js
import * as faceDetectionService from '../services/faceDetection.service.js';

/**
 * Middleware para analizar automáticamente imágenes en posts
 * Se puede agregar a la ruta de creación de posts
 * 
 * Uso:
 * router.post('/posts', verifyToken, upload.single('imagen'), faceAnalysisMiddleware, crearPost);
 */
export async function faceAnalysisMiddleware(req, res, next) {
  try {
    // Solo procesar si hay un archivo de imagen
    if (!req.file) {
      return next();
    }

    // Validar que sea una imagen
    if (!faceDetectionService.isValidImageFile(req.file)) {
      return next();
    }

    console.log('🔍 Analizando imagen automáticamente...');

    // Analizar la imagen
    const analysis = await faceDetectionService.analyzeImage(req.file.buffer);

    // Adjuntar el análisis al request para que el controlador lo use
    req.faceAnalysis = analysis.analysis;

    console.log(`✅ Análisis completado: ${analysis.analysis.faceCount} rostro(s) detectado(s)`);

    next();
  } catch (error) {
    // No bloquear la creación del post si el análisis falla
    console.error('⚠️ Error en análisis facial automático:', error.message);
    console.log('ℹ️ Continuando sin análisis facial...');
    req.faceAnalysis = null;
    next();
  }
}

/**
 * Middleware opcional para análisis asíncrono
 * Permite que el post se cree inmediatamente y analiza en background
 */
export function faceAnalysisBackgroundMiddleware(req, res, next) {
  // Solo procesar si hay un archivo de imagen
  if (!req.file || !faceDetectionService.isValidImageFile(req.file)) {
    return next();
  }

  // Guardar el buffer para análisis posterior
  const imageBuffer = Buffer.from(req.file.buffer);

  // Continuar sin esperar el análisis
  next();

  // Analizar en background después de que la respuesta se envíe
  res.on('finish', async () => {
    try {
      console.log('🔍 Iniciando análisis facial en background...');
      const analysis = await faceDetectionService.analyzeImage(imageBuffer);
      
      // Aquí podrías guardar el análisis en la base de datos usando req.postId
      // que deberías adjuntar en el controlador después de crear el post
      if (req.postId) {
        const pool = (await import('../Config/db.js')).default;
        await pool.query(
          'UPDATE posts SET face_analysis = $1, face_analysis_timestamp = NOW() WHERE id = $2',
          [JSON.stringify(analysis.analysis), req.postId]
        );
        console.log(`✅ Análisis guardado para post ${req.postId}`);
      }
    } catch (error) {
      console.error('⚠️ Error en análisis facial background:', error.message);
    }
  });
}

/**
 * Middleware para validar que una imagen contenga rostros
 * Útil si quieres requerir que las imágenes contengan al menos un rostro
 */
export async function requireFacesMiddleware(req, res, next) {
  try {
    // Solo procesar si hay un archivo de imagen
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere una imagen'
      });
    }

    // Validar que sea una imagen
    if (!faceDetectionService.isValidImageFile(req.file)) {
      return res.status(400).json({
        success: false,
        error: 'El archivo debe ser una imagen válida'
      });
    }

    // Analizar la imagen
    const analysis = await faceDetectionService.analyzeImage(req.file.buffer);

    // Validar que contenga al menos un rostro
    if (!analysis.analysis.hasFaces || analysis.analysis.faceCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'La imagen debe contener al menos un rostro visible',
        analysis: analysis.analysis
      });
    }

    // Adjuntar el análisis al request
    req.faceAnalysis = analysis.analysis;

    next();
  } catch (error) {
    console.error('❌ Error en requireFacesMiddleware:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al validar rostros en la imagen',
      details: error.message
    });
  }
}

export default {
  faceAnalysisMiddleware,
  faceAnalysisBackgroundMiddleware,
  requireFacesMiddleware
};
