# 📤 Push a GitHub y Deploy en Firebase - Gravecare

## Estado Actual
✅ **Firebase ya está configurado:**
- Proyecto: `gravecare-2e8d2`
- Hosting: Carpeta `public`
- Functions: Node.js 20

---

## PARTE 1: Push a GitHub

Después de ejecutar el script de setup, sigue estos pasos:

### 1. Crear repositorio en GitHub

1. Ve a https://github.com/new
2. Nombre: `gravecare`
3. Descripción: `Web platform for cemetery management - Plataforma web para gestión de cementerios`
4. Visibilidad: **Public** (si quieres compartir) o **Private** (privado)
5. **NO** inicialices con README, .gitignore, o LICENSE
6. Clic en "Create repository"

### 2. Hacer push desde PowerShell

```powershell
cd "C:\Users\coliv\OneDrive\Documentos\Gravecare"

# Conectar con tu repositorio remoto (reemplaza TU_USUARIO)
git remote add origin https://github.com/TU_USUARIO/gravecare.git

# Cambiar a main si es necesario
git branch -M main

# Hacer push
git push -u origin main
```

**Nota:** Si GitHub te pide credenciales:
- Usuario: Tu usuario de GitHub
- Contraseña: Un Personal Access Token (ve a Settings → Developer settings → Personal access tokens)

---

## PARTE 2: Desplegar en Firebase Hosting

Firebase hosting hace que tu página esté disponible en internet.

### 1. Instalar Firebase CLI

```powershell
npm install -g firebase-tools
```

Verifica que se instaló:
```powershell
firebase --version
```

### 2. Autenticar con Firebase

```powershell
firebase login
```

Esto abrirá tu navegador pidiendo que inicies sesión con tu cuenta de Google.

### 3. Verificar el proyecto

```powershell
cd "C:\Users\coliv\OneDrive\Documentos\Gravecare"
firebase list
```

Deberías ver `gravecare-2e8d2` en la lista.

### 4. Hacer Deploy

```powershell
firebase deploy --only hosting
```

Esto:
- Compilará tu proyecto
- Subirá los archivos a Firebase Hosting
- Te dará una URL pública (algo como: `https://gravecare-2e8d2.web.app`)

**Esperado:**
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/gravecare-2e8d2/overview
Hosting URL: https://gravecare-2e8d2.web.app
```

### 5. Verificar en el navegador

Abre: `https://gravecare-2e8d2.web.app` en tu navegador

---

## PARTE 3: Integración Git + Firebase

Para futuras actualizaciones, el workflow es:

```powershell
# 1. Hacer cambios en los archivos
# 2. Agregar cambios a Git
git add .
git commit -m "Descripción de los cambios"

# 3. Push a GitHub
git push origin main

# 4. Deploy en Firebase
firebase deploy --only hosting
```

---

## 🔗 URLs Importantes

| Servicio | URL |
|----------|-----|
| GitHub Repo | `https://github.com/TU_USUARIO/gravecare` |
| Firebase Hosting | `https://gravecare-2e8d2.web.app` |
| Firebase Console | `https://console.firebase.google.com/project/gravecare-2e8d2` |
| GitHub Settings | `https://github.com/settings/tokens` (para tokens) |

---

## ⚠️ Troubleshooting

### "Permission denied (publickey)"
→ Necesitas generar una SSH key o usar HTTPS con token

### "Cannot read properties of undefined"
→ Asegúrate que `firebase.json` está en la raíz y `public/` existe

### "You do not have permission to access this project"
→ Verifica que estés logueado con `firebase login`

### "EACCES: permission denied"
→ En Windows, ejecuta PowerShell como Administrador

---

## ✅ Checklist Final

- [ ] Script `setup-github-gravecare.bat` ejecutado
- [ ] Repositorio creado en GitHub
- [ ] Push a `main` completado
- [ ] Firebase CLI instalado
- [ ] `firebase login` hecho
- [ ] `firebase deploy` ejecutado exitosamente
- [ ] Página visible en `https://gravecare-2e8d2.web.app`

---

**¿Necesitas ayuda?** Ejecuta esto para diagnosticar:

```powershell
git remote -v
git log --oneline
firebase projects:list
firebase hosting:sites:list
```
