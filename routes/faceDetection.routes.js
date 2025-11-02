// routes/faceDetection.routes.js
import { Router } from 'express';
import multer from 'multer';
import { 
  analyzeUploadedImage, 
  analyzePostImage,
  getCachedAnalysis 
} from '../controllers/faceDetection.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Configurar multer para recibir archivos en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  },
  fileFilter: (req, file, cb) => {
    // Aceptar solo imágenes
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    
    if (validMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, WEBP, GIF)'));
    }
  }
});

/**
 * POST /api/face-detection/analyze
 * Analiza una imagen subida via FormData
 * Body: FormData con campo 'image'
 * Requiere: Token de autenticación
 */
router.post('/analyze', requireAuth, upload.single('image'), analyzeUploadedImage);

/**
 * GET /api/face-detection/analyze/:postId
 * Analiza la imagen de un post existente
 * Params: postId
 * Requiere: Token de autenticación
 */
router.get('/analyze/:postId', requireAuth, analyzePostImage);

/**
 * GET /api/face-detection/analyze/:postId/cached
 * Obtiene el análisis cacheado (si existe)
 * Params: postId
 * Requiere: Token de autenticación
 */
router.get('/analyze/:postId/cached', requireAuth, getCachedAnalysis);

export default router;
