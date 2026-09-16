# 🌿 GraveCare System - Guía de Implementación

## 📋 Descripción General

Sistema web integrado con **Firebase Firestore** para gestión operacional completa de servicios de preservación de sepulturas. Incluye módulos de planificación, gestión de flores, operadores, envío de programas y revisión de datos.

**Proyecto Firebase:** `gravecare-2e8d2`

---

## 🚀 Pasos de Implementación

### 1. **Actualizar Reglas de Firestore**

En Firebase Console → Firestore Database → Rules:

Reemplaza el contenido actual con el archivo `firestore.rules.updated` que incluye las nuevas colecciones:

- `servicios` - Servicios de planificación
- `pedidos_flores` - Pedidos de flores
- `operadores` - Datos de operadores
- `programas_visitas` - Programas enviados a operadores
- `registros_servicio` - Registros de terreno
- `revisiones` - Datos de revisión y supervisión

**Comando:**
```bash
firebase deploy --only firestore:rules
```

### 2. **Alojar el Sistema Web**

#### Opción A: Firebase Hosting (Recomendado)

1. Coloca `gravecare-system-firebase.html` en la carpeta `/public`

```bash
cp gravecare-system-firebase.html public/sistema/index.html
```

2. Actualiza `firebase.json`:

```json
{
  "hosting": {
    "public": "public",
    "ignore": [...],
    "rewrites": [
      {
        "source": "/sistema/**",
        "destination": "/sistema/index.html"
      }
    ]
  }
}
```

3. Despliega:

```bash
firebase deploy
```

El sistema será accesible en: `https://gravecare-2e8d2.web.app/sistema`

#### Opción B: Servidor Web Propio

1. Descarga `gravecare-system-firebase.html`
2. Sube a tu servidor web
3. Asegúrate que el dominio esté autorizado en Firebase Console → Authentication → Authorized domains

### 3. **Crear Cuentas de Usuario**

En Firebase Console → Authentication:

1. Crea usuarios con email/contraseña para el personal:
   - Administrador
   - Coordinadores de planificación
   - Gestores de flores
   - Supervisores de terreno

**O usa:**
```bash
firebase emulator:start  # Para desarrollo local
```

### 4. **Crear Datos Iniciales** (Opcional)

En Firestore Console, crea la colección `operadores` con algunos operadores iniciales:

```
{
  "nombre": "Carlos Mendoza",
  "telefono": "+56998123456",
  "email": "carlos@gravecare.cl",
  "rut": "12.345.678-K",
  "estado": "activo",
  "fechaCreacion": timestamp
}
```

---

## 🔐 Seguridad

### Configuración de Autenticación

**Firebase Console → Authentication → Providers:**

- ✅ Email/Password habilitado
- ✅ Google Sign-in (opcional)
- ✅ Redes corporativas (opcional)

### Restricciones de API Key

**Firebase Console → Settings → API keys:**

1. Selecciona la API key del navegador
2. **Application restrictions:** HTTP referrers
   - Agrega: `gravecare-2e8d2.web.app`
   - Agrega: `gravecare.cl`
   - Agrega: `www.gravecare.cl`

3. **API restrictions:**
   - Firestore API ✅
   - Authentication API ✅

### Reglas de Firestore

Las reglas garantizan que:
- Solo usuarios autenticados pueden leer/escribir datos
- Los datos son específicos a cada colección
- Admins pueden eliminar (opcional)

---

## 📱 Características Implementadas

### ✅ Módulo Planificación
- Crear/registrar servicios
- Asignar cementerios, fechas, tipos (SPOT, Mensual, Trimestral)
- Tabla en tiempo real de servicios

### ✅ Gestión de Flores
- Pedidos de flores por servicio
- Cantidad, tipo, presupuesto
- Sincronización en tiempo real

### ✅ Gestión de Operadores
- Registro de operadores
- Datos de contacto y RUT
- Disponibilidad en tiempo real

### ✅ Envío de Programas
- Asignación de operadores a servicios
- Fechas con 5 días de anticipación
- Instrucciones especiales
- Confirmación automática

### ✅ Día del Servicio
- Registro en terreno
- Checklist de actividades
- Horas de inicio/fin
- Observaciones

### ✅ Revisión y Supervisión
- Validación de datos
- Generación de reportes
- Preparación de informe para cliente

### ✅ Dashboard
- Métricas en tiempo real
- Servicios activos, completados, pendientes
- Contador de operadores

---

## 🔄 Sincronización en Tiempo Real

El sistema usa Firebase Firestore listeners para:

- Actualizar tablas automáticamente al agregar/modificar datos
- Sincronizar entre múltiples usuarios simultáneos
- Mantener selectores actualizados
- Actualizar dashboard en vivo

```javascript
db.collection('servicios').onSnapshot(() => {
  loadServicios();
  updateSelects();
  updateDashboard();
});
```

---

## 🌐 Integración con gravecare.cl

### Opción 1: Iframe Embebido

En `https://gravecare.cl/sistema/` o como subpágina:

```html
<iframe 
  src="https://gravecare-2e8d2.web.app/sistema"
  style="width: 100%; height: 100vh; border: none;">
</iframe>
```

### Opción 2: Link Directo

En el menú de navegación:

```html
<a href="https://gravecare-2e8d2.web.app/sistema">
  Sistema de Gestión
</a>
```

### Opción 3: Mismo Dominio

Configura proxy en tu servidor:

```nginx
location /sistema/ {
  proxy_pass https://gravecare-2e8d2.web.app/;
}
```

---

## 📊 Estructura de Datos en Firestore

### Colección: `servicios`
```
{
  cliente: string,
  contacto: string,
  tipoServicio: string ('mensual', 'spot', 'trimestral'),
  cementerio: string,
  fosa: string,
  fechaServicio: date,
  estado: string ('pendiente', 'confirmado', 'completado'),
  fechaCreacion: timestamp,
  usuarioCreador: string (UID)
}
```

### Colección: `pedidos_flores`
```
{
  servicioId: string (reference),
  cliente: string,
  tipoFlores: string,
  cantidad: number,
  presupuesto: number,
  estado: string,
  fechaCreacion: timestamp
}
```

### Colección: `operadores`
```
{
  nombre: string,
  telefono: string,
  email: string,
  rut: string,
  estado: string ('activo', 'inactivo'),
  fechaCreacion: timestamp
}
```

### Colección: `programas_visitas`
```
{
  servicioId: string (reference),
  cliente: string,
  operadorId: string (reference),
  operador: string,
  fechaEnvio: date,
  fechaEjecucion: date,
  instrucciones: string,
  estado: string ('pendiente', 'enviado', 'confirmado'),
  fechaCreacion: timestamp
}
```

### Colección: `registros_servicio`
```
{
  cliente: string,
  cementerio: string,
  fosa: string,
  operador: string,
  horaInicio: time,
  horaFin: time,
  actividades: {
    limpieza: boolean,
    desmalezado: boolean,
    flores: boolean,
    limpieza_general: boolean
  },
  observaciones: string,
  fecha: date,
  estado: string ('en_progreso', 'por_revisar', 'revisado'),
  fotosAntes: string[] (URLs),
  fotosDespues: string[] (URLs)
}
```

---

## 🛠️ Desarrollo Local

### Setup para Testing

```bash
# Instala Firebase CLI
npm install -g firebase-tools

# Inicia emulator
firebase emulator:start

# En otro terminal
firebase deploy --only firestore:rules
```

### Acceso Local
```
http://localhost:5000/sistema/
```

---

## 📞 Credenciales Firebase

**Proyecto ID:** `gravecare-2e8d2`

**API Key:** Ya incluida en el HTML

**Auth Domain:** `gravecare-2e8d2.firebaseapp.com`

**Storage Bucket:** `gravecare-2e8d2.appspot.com`

---

## 🔄 Flujo de Usuarios Típico

1. **Coordinador** → Accede, inicia sesión
2. **Planificación** → Crea nuevo servicio
3. **Gestión Flores** → Registra pedido de flores
4. **Operadores** → (Pre-cargados o registrados)
5. **Envío Programa** → Asigna operador 5+ días antes
6. **Operador** → Recibe notificación (integración con WhatsApp/Email futura)
7. **Día Servicio** → Operador registra en terreno
8. **Revisión** → Supervisor valida datos
9. **Reporte** → Cliente recibe informe

---

## 🚨 Troubleshooting

### "Error: Project not found"
→ Verifica que `firebaserc` tenga `gravecare-2e8d2` como default

### "Permiso denegado" en Firestore
→ Revisa las reglas de seguridad, asegúrate de estar autenticado

### Datos no sincronizados
→ Verifica conexión a Internet
→ Revisa console del navegador (F12) para errores
→ Confirma API key en Firebase Console

### Usuarios no pueden registrarse
→ En Authentication, habilita Email/Password
→ Crea usuarios manualmente desde Console

---

## 📈 Próximos Pasos (Funcionalidades Futuras)

1. **Integración WhatsApp** - Notificaciones a operadores
2. **Subida de Fotos** - Cloud Storage para antes/después
3. **Reportes PDF** - Descarga de comprobantes
4. **Mapas** - Ubicación de cementerios
5. **Notificaciones Push** - Recordatorios
6. **Exportación Excel** - Reportes batch
7. **Integración SMS** - Recordatorios a clientes
8. **Dashboard Analítico** - Métricas avanzadas

---

## 📝 Notas de Implementación

- El sistema es **completamente funcional** con Firestore
- Los datos se sincronizan **en tiempo real** entre usuarios
- Soporta **acceso offline** (con cache de Firestore)
- Es **responsive** y funciona en móvil
- **Seguridad** controlada por reglas de Firestore

---

**Versión:** 1.0  
**Última actualización:** Septiembre 2026  
**Desarrollado para:** Gravecare SPA - Preservación & Memoria
