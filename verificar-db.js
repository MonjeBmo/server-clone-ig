// verificar-db.js - Script para verificar estructura de la base de datos
import { pool } from './Config/db.js';

async function verificarDB() {
  console.log('\n📊 VERIFICACIÓN DE BASE DE DATOS\n');
  console.log('='.repeat(50));

  try {
    // 1. Verificar tabla guardados
    console.log('\n🔍 Verificando tabla GUARDADOS...');
    const guardados = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'guardados' 
      ORDER BY ordinal_position
    `);
    
    if (guardados.rows.length > 0) {
      console.log('✅ Tabla guardados EXISTE:');
      guardados.rows.forEach(c => console.log(`   - ${c.column_name}: ${c.data_type}`));
    } else {
      console.log('❌ Tabla guardados NO EXISTE - DEBE CREARSE');
    }

    // 2. Verificar columnas en tabla posts
    console.log('\n🔍 Verificando columnas en POSTS...');
    const posts = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'posts' 
      ORDER BY ordinal_position
    `);
    
    console.log('✅ Tabla posts tiene:');
    posts.rows.forEach(c => console.log(`   - ${c.column_name}: ${c.data_type}`));
    
    // Verificar columnas específicas
    const columnasNecesarias = ['likes_count', 'comentarios_count', 'compartidos_count'];
    console.log('\n📋 Verificando contadores:');
    columnasNecesarias.forEach(col => {
      const existe = posts.rows.some(r => r.column_name === col);
      if (existe) {
        console.log(`   ✅ ${col}: OK`);
      } else {
        console.log(`   ❌ ${col}: FALTA - DEBE AGREGARSE`);
      }
    });

    // 3. Verificar columnas en tabla mensajes
    console.log('\n🔍 Verificando columnas en MENSAJES...');
    const mensajes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'mensajes' 
      ORDER BY ordinal_position
    `);
    
    console.log('✅ Tabla mensajes tiene:');
    mensajes.rows.forEach(c => console.log(`   - ${c.column_name}: ${c.data_type}`));
    
    // Verificar columnas específicas
    const columnasMensajes = ['conversacion_id', 'leido'];
    console.log('\n📋 Verificando columnas necesarias:');
    columnasMensajes.forEach(col => {
      const existe = mensajes.rows.some(r => r.column_name === col);
      if (existe) {
        console.log(`   ✅ ${col}: OK`);
      } else {
        console.log(`   ❌ ${col}: FALTA - DEBE AGREGARSE`);
      }
    });

    // 4. Verificar otras tablas necesarias
    console.log('\n🔍 Verificando otras tablas...');
    const tablasNecesarias = ['likes', 'comentarios', 'usuarios', 'seguidores'];
    for (const tabla of tablasNecesarias) {
      const check = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [tabla]);
      
      if (check.rows[0].exists) {
        console.log(`   ✅ ${tabla}: OK`);
      } else {
        console.log(`   ❌ ${tabla}: FALTA`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('\n✨ RESUMEN:');
    console.log('\nSi ves ❌, ejecuta el archivo: verificar_tablas.sql');
    console.log('   psql -U postgres -d clone_ig -f verificar_tablas.sql\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verificarDB();
