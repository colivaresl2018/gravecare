# 🚀 Setup Gravecare - GitHub y Firebase

Debido a restricciones de permisos de OneDrive, sigue estos pasos en **PowerShell o Terminal** de tu computadora:

## Paso 1: Configurar Git globalmente

```powershell
git config --global user.name "Christian Olivares"
git config --global user.email "colivaresl2018@gmail.com"
git config --global core.longpaths true
git config --global core.safecrlf false
```

## Paso 2: Ir a la carpeta de Gravecare

```powershell
cd "C:\Users\coliv\OneDrive\Documentos\Gravecare"
```

## Paso 3: Inicializar Git

```powershell
git init --initial-branch=main
```

## Paso 4: Crear .gitignore

Copia esto en un archivo llamado `.gitignore` en la carpeta raíz:

```
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
```

## Paso 5: Agregar archivos y hacer commit

```powershell
git add .
git commit -m "Initial commit: Gravecare project setup with Firebase configuration"
```

## Paso 6: Crear repositorio en GitHub

1. Ve a https://github.com/new
2. Crea un repositorio llamado `gravecare`
3. **NO inicialices con README, .gitignore o LICENSE** (ya los tienes)
4. Copia la URL del repositorio (algo como: `https://github.com/tuusuario/gravecare.git`)

## Paso 7: Conectar con GitHub y hacer Push

```powershell
# Agregar el repositorio remoto
git remote add origin https://github.com/tuusuario/gravecare.git

# Si necesitas autenticarse, GitHub te pedirá credenciales

# Hacer push a main
git branch -M main
git push -u origin main
```

## Paso 8: Verificar Firebase (opcional)

```powershell
# Verificar que firebase está instalado
npm install -g firebase-tools

# Verificar proyecto
firebase list
firebase apps:list --project=nombre-de-tu-proyecto
```

## 📝 Notas importantes:

- Si tienes errores de permisos en OneDrive, intenta hacer esto en una carpeta fuera de OneDrive primero
- Para GitHub, si no tienes token/SSH configurado, GitHub te pedirá tu usuario y contraseña (o token de acceso)
- La carpeta `.firebase` no se subará a GitHub (está en .gitignore)
- Los archivos de configuración sensibles están protegidos

## ✅ Verificación

Una vez completado, verifica:

```powershell
git remote -v
git log --oneline
```

Deberías ver tu origen pointing a GitHub y al menos 1 commit en el log.
