@echo off
REM Script de setup para Gravecare - GitHub integration
REM Autor: Claude
REM Fecha: 2026-09-02

echo.
echo ============================================
echo   SETUP GRAVECARE - GITHUB INTEGRATION
echo ============================================
echo.

REM Paso 1: Configurar Git
echo [1/7] Configurando Git globalmente...
git config --global user.name "Christian Olivares"
git config --global user.email "colivaresl2018@gmail.com"
git config --global core.longpaths true
git config --global core.safecrlf false

REM Paso 2: Ir a la carpeta
echo.
echo [2/7] Navegando a carpeta Gravecare...
cd /d "C:\Users\coliv\OneDrive\Documentos\Gravecare"
if errorlevel 1 (
    echo ERROR: No se pudo acceder a la carpeta. Verifica la ruta.
    pause
    exit /b 1
)

REM Paso 3: Inicializar Git
echo.
echo [3/7] Inicializando repositorio Git...
git init --initial-branch=main

REM Paso 4: Crear .gitignore
echo.
echo [4/7] Creando archivo .gitignore...
(
echo # Dependencias
echo node_modules/
echo package-lock.json
echo.
echo # Firebase
echo .firebase/
echo .firebaserc
echo.
echo # Variables de entorno
echo .env
echo .env.local
echo .env.development
echo .env.production
echo.
echo # Sistemas operativos
echo .DS_Store
echo Thumbs.db
echo *.swp
echo *.swo
echo *~
echo.
echo # IDE
echo .vscode/
echo .idea/
echo *.sublime-project
echo *.sublime-workspace
echo.
echo # Logs
echo *.log
echo npm-debug.log*
echo.
echo # Archivos temporales
echo .tmp/
echo dist/
echo build/
) > .gitignore

REM Paso 5: Agregar archivos
echo.
echo [5/7] Agregando archivos a Git...
git add .

REM Paso 6: Hacer commit
echo.
echo [6/7] Haciendo primer commit...
git commit -m "Initial commit: Gravecare project setup with Firebase configuration"

echo.
echo ============================================
echo.
echo [7/7] PROXIMO PASO:
echo.
echo 1. Ve a https://github.com/new
echo 2. Crea un repositorio llamado 'gravecare'
echo 3. NO inicialices con README, .gitignore o LICENSE
echo 4. Copia la URL del repositorio
echo.
echo Luego ejecuta estos comandos en PowerShell:
echo.
echo   git remote add origin https://github.com/tuusuario/gravecare.git
echo   git branch -M main
echo   git push -u origin main
echo.
echo ============================================
echo.
pause
