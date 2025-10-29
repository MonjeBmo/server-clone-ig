// ejecutar-migracion.js - Script para ejecutar las migraciones SQL
import { pool } from './Config/db.js';
import fs from 'fs';

async function ejecutarMigracion() {
  console.log('\n🔧 EJECUTANDO MIGRACIONES DE BASE DE DATOS\n');
  console.log('='.repeat(50));

  try {
    console.log('\n📋 Paso 1: Crear tabla guardados...');
    
    // 1. Crear tabla guardados
    await pool.query(`
      CREATE TABLE IF NOT EXISTS guardados (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(usuario_id, post_id)
      );
    `);
    console.log('✅ Tabla guardados creada');

    // Índices para guardados
    await pool.query('CREATE INDEX IF NOT EXISTS idx_guardados_usuario ON guardados(usuario_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_guardados_post ON guardados(post_id);');
    console.log('✅ Índices de guardados creados');

    // 2. Agregar compartidos_count a posts
    console.log('\n📋 Paso 2: Agregar compartidos_count a posts...');
    try {
      await pool.query('ALTER TABLE posts ADD COLUMN IF NOT EXISTS compartidos_count INTEGER DEFAULT 0;');
      console.log('✅ Columna compartidos_count agregada');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('⏭️  Columna compartidos_count ya existe');
      } else {
        throw e;
      }
    }

    // 3. Agregar conversacion_id a mensajes
    console.log('\n📋 Paso 3: Modificar tabla mensajes...');
    try {
      await pool.query('ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS conversacion_id VARCHAR(50);');
      console.log('✅ Columna conversacion_id agregada');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('⏭️  Columna conversacion_id ya existe');
      } else {
        throw e;
      }
    }

    // 4. Agregar emisor_id
    try {
      await pool.query('ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS emisor_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE;');
      console.log('✅ Columna emisor_id agregada');
      
      // Copiar datos de remitente_id a emisor_id
      const result = await pool.query('UPDATE mensajes SET emisor_id = remitente_id WHERE emisor_id IS NULL;');
      if (result.rowCount > 0) {
        console.log(`✅ ${result.rowCount} registros copiados de remitente_id a emisor_id`);
      }
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('⏭️  Columna emisor_id ya existe');
      } else {
        throw e;
      }
    }

    // 5. Agregar receptor_id
    try {
      await pool.query('ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS receptor_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE;');
      console.log('✅ Columna receptor_id agregada');
      
      // Copiar datos de destinatario_id a receptor_id
      const result = await pool.query('UPDATE mensajes SET receptor_id = destinatario_id WHERE receptor_id IS NULL;');
      if (result.rowCount > 0) {
        console.log(`✅ ${result.rowCount} registros copiados de destinatario_id a receptor_id`);
      }
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('⏭️  Columna receptor_id ya existe');
      } else {
        throw e;
      }
    }

    // 6. Verificar y renombrar columnas de mensajes
    console.log('\n📋 Paso 4: Renombrar columnas de mensajes...');
    
    // Verificar si existe 'mensaje' o 'contenido'
    const checkMensaje = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'mensajes' AND column_name IN ('mensaje', 'contenido')
    `);
    
    const tieneMensaje = checkMensaje.rows.some(r => r.column_name === 'mensaje');
    const tieneContenido = checkMensaje.rows.some(r => r.column_name === 'contenido');
    
    if (!tieneMensaje && tieneContenido) {
      await pool.query('ALTER TABLE mensajes RENAME COLUMN contenido TO mensaje;');
      console.log('✅ Columna contenido renombrada a mensaje');
    } else if (tieneMensaje) {
      console.log('⏭️  Columna mensaje ya existe');
    } else {
      console.log('⚠️  No se encontró ni contenido ni mensaje - verificar manualmente');
    }

    // Verificar y renombrar fecha_envio a created_at
    const checkFecha = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'mensajes' AND column_name IN ('created_at', 'fecha_envio')
    `);
    
    const tieneCreatedAt = checkFecha.rows.some(r => r.column_name === 'created_at');
    const tieneFechaEnvio = checkFecha.rows.some(r => r.column_name === 'fecha_envio');
    
    if (!tieneCreatedAt && tieneFechaEnvio) {
      await pool.query('ALTER TABLE mensajes RENAME COLUMN fecha_envio TO created_at;');
      console.log('✅ Columna fecha_envio renombrada a created_at');
    } else if (tieneCreatedAt) {
      console.log('⏭️  Columna created_at ya existe');
    } else {
      console.log('⚠️  No se encontró ni created_at ni fecha_envio - verificar manualmente');
    }

    // 7. Crear índices de optimización
    console.log('\n📋 Paso 5: Crear índices de optimización...');
    
    const indices = [
      // Mensajes
      'CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion ON mensajes(conversacion_id)',
      'CREATE INDEX IF NOT EXISTS idx_mensajes_emisor ON mensajes(emisor_id)',
      'CREATE INDEX IF NOT EXISTS idx_mensajes_receptor ON mensajes(receptor_id)',
      
      // Likes
      'CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id)',
      'CREATE INDEX IF NOT EXISTS idx_likes_usuario ON likes(usuario_id)',
      
      // Comentarios
      'CREATE INDEX IF NOT EXISTS idx_comentarios_post ON comentarios(post_id)',
      'CREATE INDEX IF NOT EXISTS idx_comentarios_usuario ON comentarios(usuario_id)',
      
      // Posts
      'CREATE INDEX IF NOT EXISTS idx_posts_usuario ON posts(usuario_id)',
    ];

    for (const indice of indices) {
      await pool.query(indice);
    }
    console.log('✅ Todos los índices creados');

    console.log('\n' + '='.repeat(50));
    console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE!\n');

  } catch (error) {
    console.error('\n❌ ERROR durante la migración:', error.message);
    console.error('\nDetalles:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar
ejecutarMigracion();
