# 🎯 Gravecare - Configuración Completa: GitHub + Firebase

## 📋 Resumen del Proyecto

| Aspecto | Valor |
|--------|-------|
| **Nombre** | Gravecare |
| **Ubicación local** | `C:\Users\coliv\OneDrive\Documentos\Gravecare` |
| **Tipo** | Aplicación Web HTML/CSS/JavaScript |
| **Firebase Project** | `gravecare-2e8d2` |
| **Estructura** | Hosting (public) + Functions (Node.js 20) |

---

## 🔄 Flujo Completo

```
┌─────────────────────────────────────┐
│  1. CONFIGURAR GIT LOCALMENTE       │
│  - Ejecutar: setup-github-gravecare.bat
│  - Crea: .gitignore, primer commit │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. CREAR REPOSITORIO EN GITHUB     │
│  - GitHub.com/new                   │
│  - Nombre: gravecare                │
│  - Sin inicializar con archivos     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  3. HACER PUSH A GITHUB             │
│  - git remote add origin ...         │
│  - git push -u origin main           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  4. DESPLEGAR EN FIREBASE           │
│  - firebase login                    │
│  - firebase deploy --only hosting    │
│  - URL: gravecare-2e8d2.web.app     │
└─────────────────────────────────────┘
```

---

## 📁 Estructura del Proyecto Gravecare

```
Gravecare/
├── public/                    # 📌 Carpeta desplegada en Firebase
│   ├── index.html
│   ├── login.html
│   ├── dashboard.html
│   ├── css/                  # Estilos
│   ├── js/                   # JavaScript
│   ├── assets/               # Imágenes, etc
│   └── functions/            # Cloud Functions
├── functions/                # Node.js Cloud Functions
├── .firebase/                # Metadatos de Firebase
├── .firebaserc               # Configuración de proyecto Firebase
├── firebase.json             # Configuración de hosting y functions
├── firestore.rules           # Reglas de Firestore
├── ARQUITECTURA_TECNICA.md   # Documentación técnica
└── IMPLEMENTACION_GRAVECARE.md # Documentación de implementación
```

---

## 🚀 Pasos Detallados

### PASO 1: Ejecutar Script de Setup

**Windows:**
1. Descarga: `setup-github-gravecare.bat`
2. Haz doble clic para ejecutar
3. Se abrirá PowerShell y ejecutará todos los comandos automáticamente

**Qué hace:**
- ✅ Configura usuario global de Git
- ✅ Inicializa repositorio en la carpeta
- ✅ Crea `.gitignore`
- ✅ Agrega todos los archivos
- ✅ Crea primer commit

---

### PASO 2: Crear Repositorio en GitHub

1. Ve a **https://github.com/new**
2. Rellena:
   - **Repository name**: `gravecare`
   - **Description**: `Web platform for cemetery management`
   - **Visibility**: Public o Private (según prefieras)
3. ⚠️ **NO** marques:
   - Add a README file
   - Add .gitignore
   - Add a license
4. Clic en **Create repository**

---

### PASO 3: Push a GitHub

Abre PowerShell en la carpeta y ejecuta:

```powershell
cd "C:\Users\coliv\OneDrive\Documentos\Gravecare"

# Agregar el repositorio remoto (reemplaza TU_USUARIO)
git remote add origin https://github.com/TU_USUARIO/gravecare.git

# Cambiar a rama main
git branch -M main

# Hacer push
git push -u origin main
```

**Verificar:**
```powershell
git remote -v
```

Deberías ver:
```
origin  https://github.com/TU_USUARIO/gravecare.git (fetch)
origin  https://github.com/TU_USUARIO/gravecare.git (push)
```

---

### PASO 4: Desplegar en Firebase Hosting

#### 4.1 Instalar Firebase CLI

```powershell
npm install -g firebase-tools
```

Verifica:
```powershell
firebase --version
```

#### 4.2 Autenticar

```powershell
firebase login
```

Se abrirá una ventana del navegador. Inicia sesión con tu cuenta de Google.

#### 4.3 Verificar Proyecto

```powershell
firebase list
```

Deberías ver: `gravecare-2e8d2`

#### 4.4 Desplegar

```powershell
firebase deploy --only hosting
```

**Resultado esperado:**
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/gravecare-2e8d2/overview
Hosting URL: https://gravecare-2e8d2.web.app
```

---

## 🔗 Acceso a Recursos

Después del setup, podrás acceder a:

| Recurso | URL |
|---------|-----|
| **GitHub Repository** | `https://github.com/TU_USUARIO/gravecare` |
| **GitHub Code** | `https://github.com/TU_USUARIO/gravecare` (click en Code) |
| **Firebase Hosting** | `https://gravecare-2e8d2.web.app` |
| **Firebase Console** | `https://console.firebase.google.com/project/gravecare-2e8d2` |
| **Firestore Database** | `https://console.firebase.google.com/project/gravecare-2e8d2/firestore` |

---

## 📝 Workflow para Futuras Actualizaciones

**Después del setup inicial, cada cambio sigue este flujo:**

```powershell
# 1. Modificar archivos en la carpeta

# 2. Ver cambios
git status

# 3. Agregar cambios
git add .

# 4. Crear commit
git commit -m "Descripción clara del cambio"

# 5. Push a GitHub
git push origin main

# 6. Deploy a Firebase (opcional, pero recomendado)
firebase deploy --only hosting
```

---

## ⚙️ Configuración Actual de Firebase

### Hosting
- **Raíz pública**: `public/`
- **Reescrituras**: Todas las URLs van a `index.html` (para SPA)
- **Ignorados**: `.firebase/`, `node_modules/`, etc.

### Cloud Functions
- **Ubicación**: `functions/`
- **Runtime**: Node.js 20
- **URL**: `https://us-central1-gravecare-2e8d2.cloudfunctions.net/`

### Firestore
- **Proyecto**: `gravecare-2e8d2`
- **Base de datos**: Predeterminada
- **Reglas**: Definidas en `firestore.rules`

---

## 🆘 Solución de Problemas

| Error | Solución |
|-------|----------|
| `git: command not found` | Instala Git: https://git-scm.com/download/win |
| `Permission denied (publickey)` | Usa HTTPS en lugar de SSH, o configura SSH keys |
| `fatal: not a git repository` | Asegúrate de estar en `C:\...\Gravecare` |
| `firebase: command not found` | Instala con `npm install -g firebase-tools` |
| `You do not have permission` | Ejecuta `firebase login` de nuevo |
| Errores en el deploy | Verifica que `public/` existe y `firebase.json` está en raíz |

---

## ✅ Verificación Final

Ejecuta esto para confirmar todo:

```powershell
cd "C:\Users\coliv\OneDrive\Documentos\Gravecare"
echo "=== Git Status ==="
git status
echo "=== Remote ==="
git remote -v
echo "=== Log ==="
git log --oneline -5
echo "=== Firebase Projects ==="
firebase projects:list
echo "=== Firebase Hosting ==="
firebase hosting:sites:list
```

---

## 📚 Documentación Relacionada

- **ARQUITECTURA_TECNICA.md**: Estructura técnica del proyecto
- **IMPLEMENTACION_GRAVECARE.md**: Detalles de implementación
- **firestore.rules**: Reglas de seguridad de la base de datos
- **firebase.json**: Configuración de Firebase

---

## 🎓 Próximos Pasos (Opcionales)

1. **Configurar dominio personalizado** en Firebase
2. **Habilitar HTTPS/SSL** (automático en Firebase)
3. **Configurar CI/CD** en GitHub Actions
4. **Monitorear** en Firebase Console
5. **Agregar más Cloud Functions** según necesites

---

**¿Necesitas ayuda?** Contacta con Christian Olivares o consulta la documentación del proyecto.

**Última actualización**: 2 de septiembre de 2026
