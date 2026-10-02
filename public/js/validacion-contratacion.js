/**
 * VALIDACIÓN DE RUT + EMAIL EN CONTRATACIÓN
 * Ruta: public/js/validacion-contratacion.js
 * Para: contratacion-plan.html y contratacion-Spot.html
 * GraveCare Chile SpA
 */

function normalizarRut(rut) {
  return (rut || '').toLowerCase().replace(/[^0-9k]/g, '');
}

/**
 * Valida si el RUT existe en /rut_lookup
 */
async function validarRutEnContratacion(rut) {
  try {
    const cleanRut = normalizarRut(rut);
    if (!cleanRut) return { existe: false };

    // Compatibilidad tanto para SDK compat (db.collection) como modular
    if (typeof db !== 'undefined' && typeof db.collection === 'function') {
      const rutDoc = await db.collection('rut_lookup').doc(cleanRut).get();
      if (rutDoc.exists) {
        return { existe: true, datos: rutDoc.data() };
      }
    } else if (window.firebase && firebase.firestore) {
      const firestore = firebase.firestore();
      const rutDoc = await firestore.collection('rut_lookup').doc(cleanRut).get();
      if (rutDoc.exists) {
        return { existe: true, datos: rutDoc.data() };
      }
    }
    return { existe: false };
  } catch (error) {
    console.error('Error validando RUT:', error);
    mostrarAlerta('Error al validar RUT. Intente nuevamente.', 'error');
    return { existe: false };
  }
}

/**
 * Valida si el correo ya existe usando Firebase Auth
 */
async function validarEmailEnContratacion(email) {
  try {
    if (window.firebase && firebase.auth) {
      const metodos = await firebase.auth().fetchSignInMethodsForEmail(email.toLowerCase().trim());
      if (metodos && metodos.length > 0) {
        return { existe: true };
      }
    }
    return { existe: false };
  } catch (error) {
    console.warn('Aviso en validación de email:', error);
    return { existe: false };
  }
}

/**
 * Modal de decisión cuando el RUT ya existe
 */
function mostrarModalRutRegistrado(rut, datos) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4';
    
    const modal = document.createElement('div');
    modal.className = 'bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border border-slate-200';
    modal.innerHTML = `
      <div class="bg-amber-50 border-l-4 border-amber-500 p-3 rounded mb-4">
        <p class="font-bold text-amber-900 text-sm">⚠️ RUT Ya Registrado</p>
      </div>
      
      <p class="text-slate-700 text-sm mb-4">
        Este RUT ya está registrado en nuestro sistema. 
        <strong>¿Deseas incorporar esta compra a esa cuenta?</strong>
      </p>
      
      <div class="bg-slate-50 rounded-xl p-3 mb-6 space-y-1.5 text-xs text-slate-600 border border-slate-200">
        <p><strong>RUT:</strong> ${rut}</p>
        <p><strong>Nombre:</strong> ${datos.nombreCompleto || datos.nombre || 'Usuario Registrado'}</p>
        <p><strong>Email:</strong> ${datos.email || 'No disponible'}</p>
      </div>
      
      <div class="flex gap-3">
        <button id="btnNoRut" type="button" class="flex-1 px-4 py-2.5 bg-slate-200 text-slate-800 rounded-xl hover:bg-slate-300 font-bold text-xs transition cursor-pointer">
          No, Otro RUT
        </button>
        <button id="btnSiRut" type="button" class="flex-1 px-4 py-2.5 bg-[#002d1a] text-white rounded-xl hover:bg-[#1a432f] font-bold text-xs transition cursor-pointer">
          Sí, Esta Cuenta
        </button>
      </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    document.getElementById('btnNoRut').addEventListener('click', () => {
      overlay.remove();
      resolve(false);
    });
    
    document.getElementById('btnSiRut').addEventListener('click', () => {
      overlay.remove();
      resolve(true);
    });
  });
}

/**
 * Alerta de correo duplicado
 */
function mostrarAlertaEmailDuplicado() {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4';
  
  const modal = document.createElement('div');
  modal.className = 'bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border border-slate-200';
  modal.innerHTML = `
    <div class="bg-rose-50 border-l-4 border-rose-500 p-3 rounded mb-4">
      <p class="font-bold text-rose-900 text-sm">❌ Correo Electrónico Ya Registrado</p>
    </div>
    
    <p class="text-slate-700 text-sm mb-4">
      Este correo ya cuenta con una cuenta activa en el sistema. 
      <strong>Debes utilizar uno diferente o iniciar sesión para continuar.</strong>
    </p>
    
    <button id="btnOkEmail" type="button" class="w-full px-4 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 font-bold text-xs transition cursor-pointer">
      OK, Cambiar Correo
    </button>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  document.getElementById('btnOkEmail').addEventListener('click', () => {
    overlay.remove();
  });
}

/**
 * Alerta general
 */
function mostrarAlerta(mensaje, tipo = 'info') {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4';
  
  const colorMap = {
    'error': 'bg-rose-50 border-rose-500 text-rose-800',
    'success': 'bg-emerald-50 border-emerald-500 text-emerald-800',
    'warning': 'bg-amber-50 border-amber-500 text-amber-800',
    'info': 'bg-blue-50 border-blue-500 text-blue-800'
  };
  
  const modal = document.createElement('div');
  modal.className = 'bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full';
  modal.innerHTML = `
    <div class="border-l-4 p-3 rounded mb-4 ${colorMap[tipo] || colorMap['info']}">
      <p class="font-bold text-sm">${mensaje}</p>
    </div>
    <button id="btnClose" type="button" class="w-full px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 font-bold text-xs cursor-pointer">
      OK
    </button>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  document.getElementById('btnClose').addEventListener('click', () => {
    overlay.remove();
  });
}

/**
 * Validador principal del formulario
 */
async function validarFormularioContratacion() {
  const rutInput = document.getElementById('rut');
  const emailInput = document.getElementById('email');
  
  if (!rutInput || !emailInput) return false;
  
  const rut = rutInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();
  
  if (!rut || !email) {
    mostrarAlerta('Por favor completa todos los campos obligatorios.', 'warning');
    return false;
  }
  
  let cuentaExistenteAceptada = false;

  // 1. Validar RUT
  const validacionRut = await validarRutEnContratacion(rut);
  
  if (validacionRut.existe) {
    const usuarioAcepta = await mostrarModalRutRegistrado(rut, validacionRut.datos);
    
    if (!usuarioAcepta) {
      rutInput.value = '';
      rutInput.focus();
      mostrarAlerta('Por favor ingresa un nuevo RUT para continuar.', 'warning');
      return false;
    }
    
    cuentaExistenteAceptada = true;
    await precargarDatosDeUsuario(validacionRut.datos);
  }
  
  // 2. Validar Email (solo si NO se aceptó la cuenta existente que ya posee ese correo)
  if (!cuentaExistenteAceptada) {
    const validacionEmail = await validarEmailEnContratacion(email);
    if (validacionEmail.existe) {
      mostrarAlertaEmailDuplicado();
      emailInput.value = '';
      emailInput.focus();
      return false;
    }
  }
  
  return true;
}

/**
 * Precarga datos del usuario en el formulario
 */
async function precargarDatosDeUsuario(datosUsuario) {
  const campos = {
    'nombreCompleto': datosUsuario.nombreCompleto || datosUsuario.nombre || '',
    'email': datosUsuario.email || '',
    'telefono': datosUsuario.telefono || '',
    'direccion': datosUsuario.direccion || ''
  };
  
  for (const [id, valor] of Object.entries(campos)) {
    const el = document.getElementById(id);
    if (el && valor) {
      el.value = valor;
      if (['email', 'nombreCompleto'].includes(id)) {
        el.setAttribute('readonly', 'readonly');
        el.classList.add('bg-slate-100', 'text-slate-700', 'cursor-not-allowed');
      }
    }
  }
  
  mostrarBannerDatosPrecargados();
}

function mostrarBannerDatosPrecargados() {
  let banner = document.getElementById('banner-datos-precargados');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'banner-datos-precargados';
    banner.className = 'bg-emerald-50 border-l-4 border-emerald-600 p-3 rounded-lg mb-4 text-emerald-900 text-xs';
    banner.innerHTML = `
      <p class="font-bold">✓ Datos de cuenta existente cargados automáticamente</p>
      <p class="mt-0.5 text-emerald-700">Esta compra se vinculará directamente a tu perfil actual.</p>
    `;
    
    const form = document.getElementById('formularioContratacion') || document.querySelector('form');
    if (form) form.insertBefore(banner, form.firstChild);
  }
}

function guardarYRedirigirAPago(datosFormulario) {
  const orderData = {
    ...datosFormulario,
    timestamp: Date.now(),
    numeroOrden: `ORD-${Date.now()}`
  };
  localStorage.setItem('gravecare_last_order', JSON.stringify(orderData));
  window.location.href = 'confirmacion-pago.html';
}

function inicializarFormularioContratacion() {
  const form = document.getElementById('formularioContratacion') || document.querySelector('form');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = form.querySelector('button[type="submit"]');
    const textOriginal = btnSubmit ? btnSubmit.textContent : 'Proceder al Pago';
    
    if (btnSubmit) {
      btnSubmit.textContent = 'Validando datos...';
      btnSubmit.disabled = true;
    }
    
    try {
      const esValido = await validarFormularioContratacion();
      if (esValido) {
        const datos = Object.fromEntries(new FormData(form));
        guardarYRedirigirAPago(datos);
      }
    } catch (error) {
      console.error('Error en validación:', error);
      mostrarAlerta('Ocurrió un error inesperado al procesar los datos.', 'error');
    } finally {
      if (btnSubmit) {
        btnSubmit.textContent = textOriginal;
        btnSubmit.disabled = false;
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', inicializarFormularioContratacion);