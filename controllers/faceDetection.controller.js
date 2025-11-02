// controllers/faceDetection.controller.js
import * as faceDetectionService from '../services/faceDetection.service.js';
import { pool } from '../Config/db.js';

/**
 * POST /api/face-detection/analyze
 * Analiza una imagen recibida por FormData
 */
export async function analyzeUploadedImage(req, res) {
  try {
    // Validar que se haya subido un archivo
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ninguna imagen'
      });
    }

    // Validar tipo de archivo
    if (!faceDetectionService.isValidImageFile(req.file)) {
      return res.status(400).json({
        success: false,
        error: 'El archivo debe ser una imagen (JPEG, PNG, WEBP, GIF)'
      });
    }

    // Validar tamaño de archivo (10 MB máximo)
    if (!faceDetectionService.isValidFileSize(req.file, 10)) {
      return res.status(400).json({
        success: false,
        error: 'La imagen no debe superar los 10 MB'
      });
    }

    // Analizar la imagen
    const result = await faceDetectionService.analyzeImage(req.file.buffer);

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ Error en analyzeUploadedImage:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al analizar la imagen',
      details: error.message
    });
  }
}

/**
 * GET /api/face-detection/analyze/:postId
 * Analiza la imagen de un post existente
 */
export async function analyzePostImage(req, res) {
  try {
    const { postId } = req.params;

    // Validar postId
    if (!postId || isNaN(postId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de post inválido'
      });
    }

    // Obtener el post de la base de datos
    const query = `
      SELECT id, imagen_url, video_url, tipo_contenido 
      FROM posts 
      WHERE id = $1
    `;
    const result = await pool.query(query, [postId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post no encontrado'
      });
    }

    const post = result.rows[0];

    // Verificar que el post tenga una imagen
    if (!post.imagen_url && post.tipo_contenido !== 'imagen') {
      return res.status(400).json({
        success: false,
        error: 'El post no contiene una imagen para analizar'
      });
    }

    // Verificar que el post no sea un video
    if (post.video_url || post.tipo_contenido === 'video') {
      return res.status(400).json({
        success: false,
        error: 'El análisis de videos no está soportado actualmente'
      });
    }

    // Analizar la imagen desde la URL
    const analysis = await faceDetectionService.analyzeImageFromUrl(post.imagen_url);

    // Opcional: Guardar el análisis en la base de datos para cache
    const updateQuery = `
      UPDATE posts 
      SET 
        face_analysis = $1,
        face_analysis_timestamp = NOW()
      WHERE id = $2
      RETURNING face_analysis_timestamp
    `;
    
    const updateResult = await pool.query(updateQuery, [
      JSON.stringify(analysis.analysis),
      postId
    ]);

    return res.status(200).json({
      ...analysis,
      postId: parseInt(postId),
      cached: false,
      analyzedAt: updateResult.rows[0].face_analysis_timestamp
    });

  } catch (error) {
    console.error('❌ Error en analyzePostImage:', error);
    
    // Error de red o URL inválida
    if (error.message.includes('descargando')) {
      return res.status(400).json({
        success: false,
        error: 'No se pudo descargar la imagen del post',
        details: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Error al analizar la imagen del post',
      details: error.message
    });
  }
}

/**
 * GET /api/face-detection/analyze/:postId/cached
 * Obtiene el análisis cacheado de un post (si existe)
 */
export async function getCachedAnalysis(req, res) {
  try {
    const { postId } = req.params;

    if (!postId || isNaN(postId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de post inválido'
      });
    }

    const query = `
      SELECT 
        id, 
        face_analysis, 
        face_analysis_timestamp 
      FROM posts 
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [postId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post no encontrado'
      });
    }

    const post = result.rows[0];

    if (!post.face_analysis) {
      return res.status(404).json({
        success: false,
        error: 'No existe análisis cacheado para este post',
        message: 'Use el endpoint /analyze/:postId para generar un nuevo análisis'
      });
    }

    return res.status(200).json({
      success: true,
      analysis: post.face_analysis,
      postId: parseInt(postId),
      cached: true,
      analyzedAt: post.face_analysis_timestamp
    });

  } catch (error) {
    console.error('❌ Error en getCachedAnalysis:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener el análisis cacheado',
      details: error.message
    });
  }
}

export default {
  analyzeUploadedImage,
  analyzePostImage,
  getCachedAnalysis
};
