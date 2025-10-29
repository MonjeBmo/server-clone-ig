-- ============================================
-- SCRIPT SQL PARA COMPLETAR BASE DE DATOS ZEN
-- ============================================
-- Ejecutar: psql -U postgres -d clone_ig -f verificar_tablas.sql
-- O copiar y pegar en pgAdmin, DBeaver, etc.

\echo '🔧 Iniciando correcciones en la base de datos...'
\echo ''

-- ============================================
-- 1. CREAR TABLA GUARDADOS (FALTANTE)
-- ============================================

\echo '📋 Creando tabla guardados...'

CREATE TABLE IF NOT EXISTS guardados (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_guardados_usuario ON guardados(usuario_id);
CREATE INDEX IF NOT EXISTS idx_guardados_post ON guardados(post_id);

\echo '✅ Tabla guardados creada'
\echo ''

-- ============================================
-- 2. AGREGAR COLUMNAS FALTANTES EN POSTS
-- ============================================

\echo '📋 Verificando columnas en tabla posts...'

-- Esta columna ya existe, pero por si acaso
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='posts' AND column_name='compartidos_count') THEN
    ALTER TABLE posts ADD COLUMN compartidos_count INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Columna compartidos_count agregada';
  ELSE
    RAISE NOTICE '⏭️  Columna compartidos_count ya existe';
  END IF;
END $$;

\echo ''

-- ============================================
-- 3. ARREGLAR ESTRUCTURA DE MENSAJES
-- ============================================

\echo '📋 Corrigiendo tabla mensajes...'

-- La tabla mensajes tiene remitente_id y destinatario_id
-- Pero el código usa emisor_id y receptor_id
-- Necesitamos agregar conversacion_id

DO $$ 
BEGIN
  -- Agregar conversacion_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='mensajes' AND column_name='conversacion_id') THEN
    ALTER TABLE mensajes ADD COLUMN conversacion_id VARCHAR(50);
    RAISE NOTICE '✅ Columna conversacion_id agregada';
  ELSE
    RAISE NOTICE '⏭️  Columna conversacion_id ya existe';
  END IF;

  -- Agregar alias/renombres para compatibilidad
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='mensajes' AND column_name='emisor_id') THEN
    ALTER TABLE mensajes ADD COLUMN emisor_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Columna emisor_id agregada';
    
    -- Copiar datos si existen
    UPDATE mensajes SET emisor_id = remitente_id WHERE emisor_id IS NULL;
  ELSE
    RAISE NOTICE '⏭️  Columna emisor_id ya existe';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='mensajes' AND column_name='receptor_id') THEN
    ALTER TABLE mensajes ADD COLUMN receptor_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Columna receptor_id agregada';
    
    -- Copiar datos si existen
    UPDATE mensajes SET receptor_id = destinatario_id WHERE receptor_id IS NULL;
  ELSE
    RAISE NOTICE '⏭️  Columna receptor_id ya existe';
  END IF;

  -- Renombrar columna contenido a mensaje
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='mensajes' AND column_name='mensaje') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='mensajes' AND column_name='contenido') THEN
      ALTER TABLE mensajes RENAME COLUMN contenido TO mensaje;
      RAISE NOTICE '✅ Columna contenido renombrada a mensaje';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Columna mensaje ya existe';
  END IF;

  -- Renombrar fecha_envio a created_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='mensajes' AND column_name='created_at') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='mensajes' AND column_name='fecha_envio') THEN
      ALTER TABLE mensajes RENAME COLUMN fecha_envio TO created_at;
      RAISE NOTICE '✅ Columna fecha_envio renombrada a created_at';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Columna created_at ya existe';
  END IF;
END $$;

END $$;

\echo ''

-- ============================================
-- 4. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

\echo '📋 Creando índices para mejorar performance...'

-- Mensajes
CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion ON mensajes(conversacion_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_emisor ON mensajes(emisor_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_receptor ON mensajes(receptor_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_fecha ON mensajes(created_at DESC);

-- Likes
CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_usuario ON likes(usuario_id);

-- Comentarios
CREATE INDEX IF NOT EXISTS idx_comentarios_post ON comentarios(post_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_usuario ON comentarios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_fecha ON comentarios(created_at DESC);

-- Posts
CREATE INDEX IF NOT EXISTS idx_posts_usuario ON posts(usuario_id);
CREATE INDEX IF NOT EXISTS idx_posts_fecha ON posts(fecha_publicacion DESC);
CREATE INDEX IF NOT EXISTS idx_posts_estado ON posts(estado) WHERE estado = true;

\echo '✅ Índices creados'
\echo ''

-- ============================================
-- 5. SCRIPT DE VERIFICACIÓN FINAL
-- ============================================

\echo '🔍 VERIFICACIÓN FINAL:'
\echo ''

DO $$
DECLARE
  tabla_count INTEGER;
  columna_count INTEGER;
BEGIN
  -- Verificar guardados
  SELECT COUNT(*) INTO tabla_count 
  FROM information_schema.tables 
  WHERE table_name = 'guardados';
  
  IF tabla_count > 0 THEN
    RAISE NOTICE '✅ Tabla guardados: OK';
  ELSE
    RAISE NOTICE '❌ Tabla guardados: FALTA';
  END IF;
  
  -- Verificar posts.compartidos_count
  SELECT COUNT(*) INTO columna_count 
  FROM information_schema.columns 
  WHERE table_name = 'posts' AND column_name = 'compartidos_count';
  
  IF columna_count > 0 THEN
    RAISE NOTICE '✅ posts.compartidos_count: OK';
  ELSE
    RAISE NOTICE '❌ posts.compartidos_count: FALTA';
  END IF;
  
  -- Verificar mensajes.conversacion_id
  SELECT COUNT(*) INTO columna_count 
  FROM information_schema.columns 
  WHERE table_name = 'mensajes' AND column_name = 'conversacion_id';
  
  IF columna_count > 0 THEN
    RAISE NOTICE '✅ mensajes.conversacion_id: OK';
  ELSE
    RAISE NOTICE '❌ mensajes.conversacion_id: FALTA';
  END IF;
  
  -- Verificar mensajes.emisor_id
  SELECT COUNT(*) INTO columna_count 
  FROM information_schema.columns 
  WHERE table_name = 'mensajes' AND column_name = 'emisor_id';
  
  IF columna_count > 0 THEN
    RAISE NOTICE '✅ mensajes.emisor_id: OK';
  ELSE
    RAISE NOTICE '❌ mensajes.emisor_id: FALTA';
  END IF;
  
  -- Verificar mensajes.receptor_id
  SELECT COUNT(*) INTO columna_count 
  FROM information_schema.columns 
  WHERE table_name = 'mensajes' AND column_name = 'receptor_id';
  
  IF columna_count > 0 THEN
    RAISE NOTICE '✅ mensajes.receptor_id: OK';
  ELSE
    RAISE NOTICE '❌ mensajes.receptor_id: FALTA';
  END IF;
  
  -- Verificar mensajes.mensaje
  SELECT COUNT(*) INTO columna_count 
  FROM information_schema.columns 
  WHERE table_name = 'mensajes' AND column_name = 'mensaje';
  
  IF columna_count > 0 THEN
    RAISE NOTICE '✅ mensajes.mensaje: OK';
  ELSE
    RAISE NOTICE '❌ mensajes.mensaje: FALTA';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Script ejecutado correctamente!';
  RAISE NOTICE '📝 Revisa los ❌ si alguno falló';
END $$;

\echo ''
\echo '=========================================='
\echo '✨ PROCESO COMPLETADO'
\echo '=========================================='
\echo ''
\echo '📌 Próximos pasos:'
\echo '  1. Verificar que no haya errores arriba'
\echo '  2. Ejecutar: node verificar-db.js'
\echo '  3. Iniciar el servidor: npm run dev'
\echo ''
