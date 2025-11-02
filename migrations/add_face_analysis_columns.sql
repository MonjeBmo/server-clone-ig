-- ============================================
-- MIGRACIÓN: Agregar columnas para análisis facial
-- ============================================
-- Ejecutar: psql -U postgres -d clone_ig -f migrations/add_face_analysis_columns.sql
-- O copiar y pegar en pgAdmin, DBeaver, etc.

\echo '🔧 Agregando columnas para análisis facial...'
\echo ''

-- ============================================
-- Agregar columnas de análisis facial a posts
-- ============================================

DO $$ 
BEGIN
  -- Columna para almacenar el análisis facial completo (JSON)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='posts' AND column_name='face_analysis') THEN
    ALTER TABLE posts ADD COLUMN face_analysis JSONB;
    RAISE NOTICE '✅ Columna face_analysis agregada';
  ELSE
    RAISE NOTICE '⏭️  Columna face_analysis ya existe';
  END IF;

  -- Columna para almacenar timestamp del análisis
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='posts' AND column_name='face_analysis_timestamp') THEN
    ALTER TABLE posts ADD COLUMN face_analysis_timestamp TIMESTAMP;
    RAISE NOTICE '✅ Columna face_analysis_timestamp agregada';
  ELSE
    RAISE NOTICE '⏭️  Columna face_analysis_timestamp ya existe';
  END IF;
END $$;

-- ============================================
-- Crear índices para mejorar el rendimiento
-- ============================================

\echo ''
\echo '📊 Creando índices...'

-- Índice GIN para búsquedas dentro del JSON
CREATE INDEX IF NOT EXISTS idx_posts_face_analysis 
ON posts USING GIN (face_analysis);

-- Índice para filtrar posts con análisis facial
CREATE INDEX IF NOT EXISTS idx_posts_has_face_analysis 
ON posts ((face_analysis IS NOT NULL));

\echo '✅ Índices creados'
\echo ''

-- ============================================
-- Comentarios de documentación
-- ============================================

COMMENT ON COLUMN posts.face_analysis IS 
'Análisis facial completo de la imagen en formato JSON. Incluye: hasFaces, faceCount, faces (con landmarks, expressions, age, gender), timestamp';

COMMENT ON COLUMN posts.face_analysis_timestamp IS 
'Timestamp de cuándo se realizó el último análisis facial';

\echo '✅ Migración completada exitosamente'
\echo ''
\echo '📋 Resumen de columnas agregadas:'
\echo '   - face_analysis (JSONB)'
\echo '   - face_analysis_timestamp (TIMESTAMP)'
\echo '   - Índices para optimización de búsquedas'
\echo ''
