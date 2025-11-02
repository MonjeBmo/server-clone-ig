// ejecutar-migracion-face-api.js
import { pool } from './Config/db.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function ejecutarMigracion() {
  console.log('🔧 Ejecutando migración de Face API...\n');

  try {
    // Leer el archivo SQL
    const sqlPath = join(__dirname, 'migrations', 'add_face_analysis_columns.sql');
    
    if (!fs.existsSync(sqlPath)) {
      console.error('❌ No se encontró el archivo de migración:', sqlPath);
      process.exit(1);
    }

    console.log('📄 Archivo de migración encontrado');
    console.log('📊 Conectando a la base de datos...\n');

    // Agregar columna face_analysis
    console.log('➡️  Agregando columna face_analysis...');
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='posts' AND column_name='face_analysis') THEN
          ALTER TABLE posts ADD COLUMN face_analysis JSONB;
          RAISE NOTICE '✅ Columna face_analysis agregada';
        ELSE
          RAISE NOTICE '⏭️  Columna face_analysis ya existe';
        END IF;
      END $$;
    `);
    console.log('✅ Columna face_analysis verificada');

    // Agregar columna face_analysis_timestamp
    console.log('➡️  Agregando columna face_analysis_timestamp...');
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='posts' AND column_name='face_analysis_timestamp') THEN
          ALTER TABLE posts ADD COLUMN face_analysis_timestamp TIMESTAMP;
          RAISE NOTICE '✅ Columna face_analysis_timestamp agregada';
        ELSE
          RAISE NOTICE '⏭️  Columna face_analysis_timestamp ya existe';
        END IF;
      END $$;
    `);
    console.log('✅ Columna face_analysis_timestamp verificada');

    // Crear índice GIN para búsquedas JSON
    console.log('➡️  Creando índice idx_posts_face_analysis...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_face_analysis 
      ON posts USING GIN (face_analysis);
    `);
    console.log('✅ Índice idx_posts_face_analysis creado');

    // Crear índice para filtrar posts con análisis
    console.log('➡️  Creando índice idx_posts_has_face_analysis...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_has_face_analysis 
      ON posts ((face_analysis IS NOT NULL));
    `);
    console.log('✅ Índice idx_posts_has_face_analysis creado');

    // Agregar comentarios de documentación
    console.log('➡️  Agregando comentarios de documentación...');
    await pool.query(`
      COMMENT ON COLUMN posts.face_analysis IS 
      'Análisis facial completo de la imagen en formato JSON. Incluye: hasFaces, faceCount, faces (con landmarks, expressions, age, gender), timestamp';
    `);
    await pool.query(`
      COMMENT ON COLUMN posts.face_analysis_timestamp IS 
      'Timestamp de cuándo se realizó el último análisis facial';
    `);
    console.log('✅ Comentarios agregados');

    console.log('\n🎉 ¡Migración completada exitosamente!\n');
    console.log('📋 Resumen de cambios:');
    console.log('   ✅ Columna face_analysis (JSONB)');
    console.log('   ✅ Columna face_analysis_timestamp (TIMESTAMP)');
    console.log('   ✅ Índice GIN para búsquedas JSON');
    console.log('   ✅ Índice para filtrar posts analizados');
    console.log('   ✅ Comentarios de documentación\n');

    // Verificar estructura final
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'posts' 
      AND column_name IN ('face_analysis', 'face_analysis_timestamp')
      ORDER BY column_name;
    `);

    console.log('🔍 Columnas verificadas:');
    result.rows.forEach(row => {
      console.log(`   ✅ ${row.column_name} (${row.data_type})`);
    });

    console.log('\n✨ ¡Todo listo para usar Face Detection API!');

  } catch (error) {
    console.error('\n❌ Error ejecutando migración:', error.message);
    console.error('Detalles:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔌 Conexión a base de datos cerrada');
  }
}

// Ejecutar migración
ejecutarMigracion();
