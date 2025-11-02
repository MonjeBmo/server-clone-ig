# 🛠️ Comandos Útiles - Face Detection API

## 🚀 Comandos de Servidor

### Iniciar servidor (desarrollo)
```powershell
npm run dev
```

### Iniciar servidor (producción)
```powershell
node app.js
```

### Verificar servidor activo
```powershell
curl http://localhost:4000
# Debería responder: "Zen Backend API:D"
```

---

## 🗄️ Comandos de Base de Datos

### Ejecutar migración de Face API
```powershell
node ejecutar-migracion-face-api.js
```

### Verificar columnas creadas (psql)
```sql
-- Conectar a la base de datos
psql -U postgres -d clone_ig

-- Ver columnas de posts
\d posts

-- Ver solo columnas de face analysis
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'posts' 
AND column_name LIKE 'face%';
```

### Consultas útiles
```sql
-- Ver posts con análisis facial
SELECT id, face_analysis IS NOT NULL as tiene_analisis 
FROM posts 
LIMIT 10;

-- Contar posts analizados
SELECT COUNT(*) as posts_analizados 
FROM posts 
WHERE face_analysis IS NOT NULL;

-- Ver análisis de un post específico
SELECT face_analysis 
FROM posts 
WHERE id = 1;

-- Buscar posts con personas felices
SELECT id, face_analysis->'faces'->0->'expressions'->'dominant' as expresion
FROM posts 
WHERE face_analysis->'faces'->0->'expressions'->>'dominant' LIKE '%happy%';
```

---

## 🧪 Comandos de Testing

### Ejecutar script de prueba automático
```powershell
# 1. Editar test-face-api.js primero
# 2. Ejecutar
node test-face-api.js
```

### Probar con cURL (Windows PowerShell)

#### Login
```powershell
$response = Invoke-RestMethod `
  -Uri "http://localhost:4000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"tu@email.com","password":"tupass"}'

$token = $response.token
Write-Host "Token: $token"
```

#### Analizar Post Existente
```powershell
$postId = 1
$response = Invoke-RestMethod `
  -Uri "http://localhost:4000/api/face-detection/analyze/$postId" `
  -Method GET `
  -Headers @{Authorization="Bearer $token"}

$response | ConvertTo-Json -Depth 10
```

#### Obtener Análisis Cacheado
```powershell
$response = Invoke-RestMethod `
  -Uri "http://localhost:4000/api/face-detection/analyze/$postId/cached" `
  -Method GET `
  -Headers @{Authorization="Bearer $token"}

$response | ConvertTo-Json -Depth 10
```

---

## 📦 Comandos de Dependencias

### Instalar dependencias
```powershell
npm install
```

### Verificar face-api.js instalado
```powershell
npm list face-api.js
```

### Reinstalar dependencias (si hay problemas)
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

---

## 🧹 Comandos de Limpieza

### Limpiar cache de npm
```powershell
npm cache clean --force
```

### Eliminar logs
```powershell
Remove-Item *.log
```

### Verificar archivos de modelos
```powershell
Get-ChildItem -Path "ml-models\face-api" -File | Measure-Object -Property Length -Sum | Select-Object Count,@{Name="SizeMB";Expression={[math]::Round($_.Sum/1MB,2)}}
```

---

## 🔍 Comandos de Debugging

### Ver logs del servidor en tiempo real
```powershell
# Ya se ven automáticamente al correr npm run dev
npm run dev
```

### Verificar puerto 4000 en uso
```powershell
netstat -ano | findstr :4000
```

### Matar proceso en puerto 4000
```powershell
# Encontrar PID
$pid = (Get-NetTCPConnection -LocalPort 4000).OwningProcess
# Matar proceso
Stop-Process -Id $pid -Force
```

### Ver versiones instaladas
```powershell
node --version
npm --version
psql --version
```

---

## 📊 Comandos de Git

### Ver estado actual
```powershell
git status
```

### Ver cambios en branch implementacion-faceAPI
```powershell
git diff main..implementacion-faceAPI
```

### Agregar todos los archivos nuevos
```powershell
git add .
```

### Commit de la implementación
```powershell
git commit -m "feat: Implementar Face Detection API con face-api.js

- Agregar detección de rostros, landmarks, expresiones
- Agregar estimación de edad y género
- Crear 3 endpoints REST
- Agregar migración de base de datos
- Incluir 14 modelos ML (4.8 MB)
- Documentación completa"
```

### Push al repositorio
```powershell
git push origin implementacion-faceAPI
```

---

## 🔧 Comandos de Desarrollo

### Verificar sintaxis de archivos
```powershell
# Verificar un archivo específico
node --check services/faceDetection.service.js

# Verificar todos los archivos JS
Get-ChildItem -Path . -Filter "*.js" -Recurse | ForEach-Object { 
  node --check $_.FullName 
}
```

### Formatear código (si tienes prettier)
```powershell
npx prettier --write "**/*.js"
```

### Ejecutar linter (si tienes eslint)
```powershell
npx eslint .
```

---

## 📝 Comandos de Documentación

### Ver documentación en terminal
```powershell
# Quick Start
Get-Content QUICK_START_FACE_API.md

# API completa
Get-Content FACE_DETECTION_API.md

# Status
Get-Content STATUS_COMPLETE.md
```

### Abrir documentación en navegador (si tienes markdown viewer)
```powershell
Start-Process QUICK_START_FACE_API.md
```

---

## 🎯 Comandos Rápidos (Cheat Sheet)

```powershell
# Setup inicial (una sola vez)
npm install
node ejecutar-migracion-face-api.js

# Desarrollo diario
npm run dev

# Testing rápido
node test-face-api.js

# Ver logs de base de datos
psql -U postgres -d clone_ig

# Ver posts analizados
psql -U postgres -d clone_ig -c "SELECT COUNT(*) FROM posts WHERE face_analysis IS NOT NULL;"
```

---

## 🆘 Comandos de Solución de Problemas

### Problema: "Cannot find module"
```powershell
npm install
```

### Problema: "Port 4000 already in use"
```powershell
$pid = (Get-NetTCPConnection -LocalPort 4000).OwningProcess
Stop-Process -Id $pid -Force
npm run dev
```

### Problema: "Models not found"
```powershell
node scripts/download-face-models.js
```

### Problema: "Database connection error"
```powershell
# Verificar que PostgreSQL esté corriendo
Get-Service -Name postgresql*

# Verificar .env
Get-Content .env
```

### Problema: "Canvas binary not found"
```powershell
npm uninstall canvas
npm install canvas
```

---

## 📚 Recursos Adicionales

### Documentación oficial
```
face-api.js: https://github.com/justadudewhohacks/face-api.js
TensorFlow.js: https://www.tensorflow.org/js
Canvas: https://github.com/Automattic/node-canvas
```

### Postman Collection
```
Importar en Postman:
- POST /api/auth/login
- POST /api/face-detection/analyze
- GET /api/face-detection/analyze/:postId
- GET /api/face-detection/analyze/:postId/cached
```

---

¡Estos comandos cubren todo lo necesario para trabajar con Face Detection API! 🎭✨
