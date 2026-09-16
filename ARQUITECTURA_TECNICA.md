
 🏗️ Arquitectura Técnica - GraveCare System

## 📐 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    GRAVECARE SYSTEM                          │
│              (gravecare-system-firebase.html)                │
└──────────────┬──────────────────────────────────────────────┘
               │
        ┌──────▼──────┐
        │  Frontend    │
        │  (HTML/CSS)  │ ← UI elegante, responsive
        └──────┬───────┘
               │
        ┌──────▼──────────────┐
        │  Firebase SDK 10.7   │
        │  Auth + Firestore    │
        └──────┬───────────────┘
               │
      ┌────────┴────────┐
      │                 │
  ┌───▼──┐         ┌───▼──────┐
  │ Auth │         │ Firestore │
  │      │         │ Database  │
  └──────┘         └───┬──────┘
      │                │
      │           ┌────▼─────────────────┐
      │           │ Colecciones:         │
      │           │ • servicios          │
      │           │ • pedidos_flores     │
      │           │ • operadores         │
      │           │ • programas_visitas  │
      │           │ • registros_servicio │
      │           │ • revisiones         │
      │           └──────────────────────┘
```

---

## 🔧 Stack Tecnológico

### Frontend
- **HTML5** - Estructura semántica
- **CSS3** - Estilos modernos, variables CSS
- **JavaScript Vanilla** - Sin dependencias externas
- **Responsive Design** - Mobile-first

### Backend
- **Firebase Authentication** - Gestión de usuarios
- **Firebase Firestore** - Base de datos NoSQL en tiempo real
- **Firebase Hosting** - Alojamiento web
- **Firebase Storage** - Almacenamiento de archivos (para fotos)

### Security
- **Firestore Rules** - Control de acceso granular
- **JWT Tokens** - Validación de sesión
- **HTTPS/TLS** - Encriptación en tránsito

---

## 📦 Componentes Principales

### 1. **Módulo de Autenticación**

```javascript
// Login
auth.signInWithEmailAndPassword(email, password)

// Logout
auth.signOut()

// Monitor de estado
auth.onAuthStateChanged((user) => {
  if (user) { /* mostrar app */ }
  else { /* mostrar login */ }
})
```

**Características:**
- Login con email/contraseña
- Sesión persistente
- Cierre de sesión
- Gestión de errores

### 2. **Módulo de Datos (Firestore)**

```javascript
// CREATE
await db.collection('servicios').add({
  cliente: "...",
  fechaServicio: date,
  estado: "pendiente"
})

// READ
const snapshot = await db.collection('servicios').get()
servicios = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))

// UPDATE
await db.collection('servicios').doc(id).update({estado: "completado"})

// DELETE (controlado por reglas)
await db.collection('servicios').doc(id).delete()
```

**Real-time Listeners:**
```javascript
db.collection('servicios').onSnapshot((snapshot) => {
  servicios = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}))
  renderServicios()
})
```

### 3. **Módulo de UI**

#### Dashboard
- Contadores en tiempo real
- Métricas KPI (servicios activos, pendientes, completados)
- Actualización automática

#### Pestañas de Navegación
```
Dashboard → Planificación → Flores → Operadores → 
Envío Programa → Día del Servicio → Revisión Datos
```

#### Formularios Dinámicos
- Validación frontend
- Sincronización de selectores
- Mensajes de confirmación

#### Tablas Dinámicas
- Actualización en tiempo real
- Paginación (futura)
- Exportación (futura)

---

## 🔐 Flujo de Seguridad

### Autenticación
```
Usuario → Email/Contraseña → Firebase Auth → JWT Token → Sesión
```

### Autorización (Firestore Rules)
```
request.auth != null && request.auth.uid == userId
↓
Acceso permitido solo a datos del usuario

request.auth.token.admin == true
↓
Acceso a operaciones de administración
```

---

## ⚡ Flujo de Datos

### 1. Crear Servicio
```
Usuario llena formulario
↓
Submit → validación
↓
db.collection('servicios').add(datos)
↓
Firestore almacena
↓
Listener dispara
↓
loadServicios() actualiza tabla
↓
updateSelectsServicios() sincroniza selectores
↓
updateDashboard() recuenta
```

### 2. Asignar Operador
```
Selecciona servicio y operador
↓
Crea registro en programas_visitas
↓
Firestore almacena + timestamp
↓
Listener dispara
↓
renderProgramas() muestra en tabla
↓
Dashboard actualiza contador
```

### 3. Registrar Servicio en Terreno
```
Operador llena formulario en terreno
↓
Registra actividades (checklist)
↓
Agregar fotos (Cloud Storage)
↓
Submit → db.collection('registros_servicio').add()
↓
Firestore almacena
↓
Estado = "por_revisar"
↓
Supervisor ve en Revisión Datos
```

---

## 🗄️ Esquema de Datos (Firestore Collections)

### servicios
```
├── id (document ID)
├── cliente (string)
├── contacto (string: email/teléfono)
├── tipoServicio (string: "mensual"|"spot"|"trimestral")
├── cementerio (string)
├── fosa (string)
├── fechaServicio (timestamp)
├── estado (string: "pendiente"|"confirmado"|"completado")
├── fechaCreacion (timestamp)
└── usuarioCreador (string: UID)
```

### pedidos_flores
```
├── id (document ID)
├── servicioId (string: reference a servicios)
├── cliente (string)
├── tipoFlores (string: "rosas_blancas"|"lirios"|etc)
├── cantidad (number)
├── presupuesto (number: CLP)
├── estado (string: "pendiente"|"comprado"|"entregado")
└── fechaCreacion (timestamp)
```

### operadores
```
├── id (document ID)
├── nombre (string)
├── telefono (string: +56...)
├── email (string)
├── rut (string: 12.345.678-K)
├── estado (string: "activo"|"inactivo")
└── fechaCreacion (timestamp)
```

### programas_visitas
```
├── id (document ID)
├── servicioId (string: reference)
├── cliente (string)
├── operadorId (string: reference)
├── operador (string)
├── fechaEnvio (date)
├── fechaEjecucion (date)
├── instrucciones (string)
├── estado (string: "pendiente"|"enviado"|"confirmado")
└── fechaCreacion (timestamp)
```

### registros_servicio
```
├── id (document ID)
├── cliente (string)
├── cementerio (string)
├── fosa (string)
├── operador (string)
├── horaInicio (time)
├── horaFin (time)
├── actividades (object)
│   ├── limpieza (boolean)
│   ├── desmalezado (boolean)
│   ├── flores (boolean)
│   └── limpieza_general (boolean)
├── observaciones (string)
├── fecha (date)
├── estado (string: "en_progreso"|"por_revisar"|"revisado")
├── fotosAntes (array: URLs)
└── fotosDespues (array: URLs)
```

### revisiones
```
├── id (document ID)
├── registroId (string: reference a registros_servicio)
├── supervisor (string: UID)
├── datosCompletos (boolean)
├── fotosValidadas (boolean)
├── observacionesSupervisor (string)
├── estado (string: "aprobado"|"rechazado")
├── reporteGenerado (boolean)
├── reporteEnviado (boolean: por email/WhatsApp)
└── fechaRevision (timestamp)
```

---

## 🔍 Índices de Firestore (para optimización)

### Recomendados para Crear:

```
Collection: servicios
Indexes:
  - fechaServicio (Descending)
  - estado (Ascending)
  
Collection: registros_servicio
Indexes:
  - estado (Ascending)
  - fecha (Descending)
  
Collection: programas_visitas
Indexes:
  - operador (Ascending)
  - fechaEjecucion (Ascending)
```

*Firebase crea automáticamente índices simples; estos son para queries complejas.*

---

## 📱 Responsive Design

### Breakpoints
```css
Mobile:     < 480px  → 1 columna
Tablet:     480-768px → 2 columnas
Desktop:    > 768px  → 3+ columnas (grid-auto-fit)
```

### Componentes Responsivos
```javascript
.grid-2 {
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  // Automáticamente 1, 2, 3+ columnas según ancho
}
```

---

## ⚙️ Performance

### Optimizaciones Implementadas

1. **Lazy Loading** - Datos se cargan bajo demanda
2. **Real-time Listeners** - Solo subscripción a colecciones necesarias
3. **Caché Local** - Firestore cachea automáticamente
4. **CSS Variables** - Tema único, sin recalc innecesarios
5. **Minimal JavaScript** - Vanilla JS, sin frameworks pesados
6. **Índices Firestore** - Queries optimizadas

### Métricas Esperadas
- **FCP** (First Contentful Paint): < 1s
- **LCP** (Largest Contentful Paint): < 2.5s
- **CLS** (Cumulative Layout Shift): < 0.1
- **Database Query**: < 500ms (con índices)

---

## 🧪 Testing

### Casos de Prueba Críticos

1. **Autenticación**
   - Login con credenciales válidas ✓
   - Login con credenciales inválidas ✓
   - Mantener sesión después de refresh ✓
   - Logout limpia estado ✓

2. **Crear Servicio**
   - Formulario valida campos requeridos ✓
   - Datos se guardan en Firestore ✓
   - Tabla actualiza en tiempo real ✓
   - Selectores sincronizados ✓

3. **Sincronización Real-time**
   - Abre 2 ventanas, crea en una → aparece en otra ✓
   - Modificar en Firestore Console → aparece en app ✓
   - Eliminar registro → se remueve de tabla ✓

4. **Seguridad**
   - Usuario no autenticado → no ve datos ✓
   - Usuario autenticado → ve solo sus datos ✓
   - Admin puede eliminar → otros no pueden ✓

---

## 🔄 Integración con Sistemas Externos (Futuros)

### WhatsApp API
```javascript
// Enviar programa a operador por WhatsApp
await sendWhatsAppNotification(operador.telefono, programaData)
```

### Cloud Storage (Fotos)
```javascript
// Subir fotos antes/después
const fotosRef = firebase.storage().ref(`servicios/${servicioId}/fotos/`)
await fotosRef.child('antes.jpg').put(file)
```

### Sendgrid/SendGrid (Reportes por Email)
```javascript
// Enviar reporte al cliente
await sendEmailReport(cliente.email, reporteData)
```

### Google Maps API
```javascript
// Ubicar cementerios en mapa
const map = new google.maps.Map(element, options)
```

---

## 📊 Monitoreo y Debugging

### Firebase Console
- **Authentication** - Ver usuarios, sesiones activas
- **Firestore** - Ver colecciones, documentos, métricas
- **Hosting** - Logs de deployment, analytics
- **Storage** - Archivos subidos, uso de storage

### Browser DevTools
```javascript
// En Console
// Ver servicios en memoria
console.log(servicios)

// Monitor listeners
firebase.database.enableLogging(true)

// Performance
performance.measure('render')
```

### Logs de Aplicación
```javascript
try {
  await db.collection('servicios').add(datos)
  console.log('✓ Servicio creado:', datos)
} catch (error) {
  console.error('✗ Error:', error.message)
}
```

---

## 🚀 Deployment Checklist

- [ ] Actualizar reglas de Firestore
- [ ] Crear usuarios iniciales
- [ ] Probar autenticación
- [ ] Verificar sincronización real-time
- [ ] Testear en mobile
- [ ] Configurar CORS si es necesario
- [ ] Setupear backups automáticos
- [ ] Configurar alertas de cuota
- [ ] Documentar credenciales
- [ ] Entrenar usuarios

---

**Versión:** 1.0  
**Desarrollado con:** Firebase SDK 10.7.0  
**Compatibilidad:** Chrome, Firefox, Safari, Edge (últimas 2 versiones)  
**Mobile:** iOS Safari, Android Chrome
