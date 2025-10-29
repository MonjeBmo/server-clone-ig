# 📋 CHECKLIST: Tablas que Necesitas Verificar

## ✅ TABLAS QUE YA TIENES (Confirmadas)
- ✅ `usuarios`
- ✅ `posts` (con `likes_count` y `comentarios_count`)
- ✅ `likes`
- ✅ `comentarios`
- ✅ `mensajes` (con columna `leido`)
- ✅ `seguidores`
- ✅ `sesiones_login`
- ✅ `bitacora_auditoria`
- ✅ `busquedas_recientes`

---

## ❌ LO QUE FALTA (Debes agregar)

### 1. Tabla `guardados` (FALTA COMPLETA)
**Propósito:** Posts guardados/saved por usuarios

**Columnas:**
```sql
- id (SERIAL PRIMARY KEY)
- usuario_id (INTEGER)
- post_id (INTEGER)
- created_at (TIMESTAMP)
```

---

### 2. Columnas en tabla `posts`
**Falta:**
- ✅ `likes_count` - YA EXISTE
- ✅ `comentarios_count` - YA EXISTE
- ❌ `compartidos_count` - **DEBE AGREGARSE**

---

### 3. Columnas en tabla `mensajes`
**Problema:** Tu tabla tiene `remitente_id`, `destinatario_id`, `contenido`, `fecha_envio`
**Pero el código necesita:** `emisor_id`, `receptor_id`, `mensaje`, `created_at`, `conversacion_id`

**Debe agregarse:**
- ❌ `conversacion_id` (VARCHAR) - **NECESARIO para Socket.IO**
- ❌ `emisor_id` (INTEGER) - **Alias de remitente_id**
- ❌ `receptor_id` (INTEGER) - **Alias de destinatario_id**
- ❌ Renombrar `contenido` → `mensaje`
- ❌ Renombrar `fecha_envio` → `created_at`

---

## 🚀 CÓMO ARREGLARLO

### Opción 1: Ejecutar el script SQL automático

```bash
# Conéctate a PostgreSQL y ejecuta:
psql -U postgres -d clone_ig -f server/verificar_tablas.sql
```

### Opción 2: Copiar/pegar en pgAdmin, DBeaver, etc.

Abre el archivo `server/verificar_tablas.sql` y ejecuta todo el contenido.

---

## 🔍 VERIFICAR QUE TODO ESTÉ BIEN

Después de ejecutar el script SQL:

```bash
cd server
node verificar-db.js
```

Deberías ver solo ✅ sin ningún ❌

---

## 📊 RESUMEN DE LO QUE HACE EL SCRIPT

1. ✅ Crea tabla `guardados`
2. ✅ Agrega `compartidos_count` a `posts`
3. ✅ Agrega `conversacion_id`, `emisor_id`, `receptor_id` a `mensajes`
4. ✅ Renombra columnas de `mensajes` para compatibilidad
5. ✅ Crea índices para optimizar consultas
6. ✅ Verifica que todo esté correcto

---

## ⚠️ IMPORTANTE

**Antes de ejecutar el script:**
- Haz un backup de tu base de datos
- Verifica que tengas conexión a PostgreSQL
- Asegúrate de estar en la base de datos correcta (`clone_ig`)

**Comando de backup:**
```bash
pg_dump -U postgres clone_ig > backup_clone_ig.sql
```
