# Script para hacer push de Gravecare a GitHub
# Ejecutar en PowerShell como administrador

Write-Host "========================================" -ForegroundColor Green
Write-Host "  PUSH GRAVECARE A GITHUB"
Write-Host "========================================" -ForegroundColor Green

# Ir a la carpeta Gravecare
cd "C:\Users\coliv\OneDrive\Documentos\Gravecare"

# Verificar si git está inicializado
if (!(Test-Path ".git")) {
    Write-Host "Inicializando Git..." -ForegroundColor Cyan
    git init --initial-branch=main
    git config user.name "Christian Olivares"
    git config user.email "colivaresl2018@gmail.com"
}

# Crear .gitignore si no existe
if (!(Test-Path ".gitignore")) {
    Write-Host "Creando .gitignore..." -ForegroundColor Cyan
    @"
# Dependencias
node_modules/
package-lock.json

# Firebase
.firebase/
.firebaserc

# Variables de entorno
.env
.env.local
.env.development
.env.production

# Sistemas operativos
.DS_Store
Thumbs.db
*.swp
*.swo
*~

# IDE
.vscode/
.idea/
*.sublime-project
*.sublime-workspace

# Logs
*.log
npm-debug.log*

# Archivos temporales
.tmp/
dist/
build/
"@ | Out-File -Encoding UTF8 ".gitignore"
}

# Crear README si no existe
if (!(Test-Path "README.md")) {
    Write-Host "Creando README.md..." -ForegroundColor Cyan
    @"
# Gravecare

Web platform for cemetery management - Plataforma web para gestión de cementerios

## Deploy
- **Website**: https://www.gravecare.cl
- **Firebase Hosting**: https://gravecare-2e8d2.web.app
- **Firebase Project**: gravecare-2e8d2

## Technology Stack
- Frontend: HTML5, CSS3, JavaScript
- Backend: Firebase (Firestore, Cloud Functions, Authentication)
- Hosting: Firebase Hosting

## Setup
\`\`\`bash
firebase login
firebase deploy
\`\`\`
"@ | Out-File -Encoding UTF8 "README.md"
}

# Agregar archivos
Write-Host "Agregando archivos..." -ForegroundColor Cyan
git add .

# Hacer commit si hay cambios
Write-Host "Creando commit..." -ForegroundColor Cyan
$status = git status --porcelain
if ($status) {
    git commit -m "Initial commit: Gravecare with Firebase configuration"
} else {
    Write-Host "No hay cambios para commitear" -ForegroundColor Yellow
}

# Agregar remoto si no existe
$remoteExists = git remote get-url origin 2>$null
if (!$remoteExists) {
    Write-Host "Agregando remoto de GitHub..." -ForegroundColor Cyan
    git remote add origin https://github.com/colivaresl2018/gravecare.git
}

# Cambiar a main
Write-Host "Configurando rama main..." -ForegroundColor Cyan
git branch -M main

# Hacer push
Write-Host "Haciendo push a GitHub..." -ForegroundColor Cyan
git push -u origin main --force

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ COMPLETADO EXITOSAMENTE"
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Tu repositorio está en:" -ForegroundColor Cyan
Write-Host "https://github.com/colivaresl2018/gravecare"
Write-Host ""
Write-Host "Tu página en vivo:" -ForegroundColor Cyan
Write-Host "https://www.gravecare.cl"
Write-Host ""

# Mostrar estado
git log --oneline -5
