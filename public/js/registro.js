/**
 * REGISTRO.JS - Módulo de Registro de Usuarios para GraveCare
 * Ubicación: /js/registro.js
 * 
 * Funcionalidades:
 * - Registra usuario en Firebase Auth
 * - Guarda datos personales en Firestore (usuarios/{uid})
 * - Crea sepultura si viene de contratacion-plan.html
 * - Maneja errores y validaciones
 */

import { auth, db } from "./firebaseConfig.js";
import { 
  createUserWithEmailAndPassword, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { 
  doc, 
  setDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { crearSepultura } from "./migracion-sepulturas.js";

// ============ REGISTRO DE USUARIO ============
export async function registrarUsuario(datosFormulario) {
  try {
    const {
      // Datos personales
      nombres,
      apellidoPaterno,
      apellidoMaterno,
      email,
      contrasena,
      telefono,
      direccion,
      comuna,
      region,
      rut,
      fechaNacimiento,
      
      // Datos de sepultura (opcional, si viene de contratacion)
      cementerio,
      numeroSepultura,
      patio,
      sector,
      ubicacion,
      plan,
      proximaVisita,
      nombreSepultura
    } = datosFormulario;

    // ============ VALIDACIONES ============
    if (!email || !contrasena) {
      throw new Error("Email y contraseña son requeridos");
    }

    if (contrasena.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres");
    }

    if (!nombres || !apellidoPaterno || !rut) {
      throw new Error("Nombres, apellido paterno y RUT son requeridos");
    }

    // ============ 1. CREAR USUARIO EN FIREBASE AUTH ============
    console.log("📝 Registrando usuario en Firebase Auth...");
    const userCred = await createUserWithEmailAndPassword(auth, email, contrasena);
    const user = userCred.user;
    console.log("✅ Usuario creado:", user.uid);

    // ============ 2. GUARDAR DATOS PERSONALES EN FIRESTORE ============
    console.log("💾 Guardando datos personales...");
    const nombreCompleto = `${nombres} ${apellidoPaterno} ${apellidoMaterno}`;
    
    const usuarioData = {
      uid: user.uid,
      email: user.email,
      nombreCompleto: nombreCompleto,
      nombres: nombres,
      apellidoPaterno: apellidoPaterno,
      apellidoMaterno: apellidoMaterno,
      telefono: telefono || "",
      direccion: direccion || "",
      comuna: comuna || "",
      region: region || "",
      rut: rut,
      fechaNacimiento: fechaNacimiento || "",
      displayName: nombreCompleto,
      photoURL: "",
      rol: "cliente",
      tipoSuscripcion: "SPOT",
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      // Campos iniciales (se llenarán después)
      planNombre: "",
      precioBase: 0,
      precioTotal: 0,
      estadoSuscripcion: "Activo",
      metodoPago: "Por definir",
      ultimosDigitos: "****"
    };

    // Guardar usuario en Firestore
    const userRef = doc(db, "usuarios", user.uid);
    await setDoc(userRef, usuarioData, { merge: true });
    console.log("✅ Datos personales guardados");

    // ============ 3. CREAR SEPULTURA (SI VIENE DE CONTRATACION) ============
    if (cementerio && numeroSepultura) {
      console.log("🪦 Creando sepultura...");
      
      const datosSepultura = {
        nombre: nombreSepultura || "Sepultura Contratada",
        tipo: cementerio,
        cementerio: cementerio,
        cementerioNombre: cementerio,
        numeroSepultura: numeroSepultura,
        patio: patio || "",
        sector: sector || "",
        ubicacion: ubicacion || `Sector: ${sector}, Nº ${numeroSepultura}`,
        plan: plan || "Plan Base",
        proximaVisita: proximaVisita || "",
        estado: "Servicio Activo",
        esSpot: true,
        tipoSuscripcion: "SPOT"
      };

      const resultadoSepultura = await crearSepultura(user.uid, usuarioData, datosSepultura);
      
      if (resultadoSepultura.success) {
        console.log("✅ Sepultura creada:", resultadoSepultura.id);
      } else {
        console.warn("⚠️ Error creando sepultura (pero usuario registrado):", resultadoSepultura.error);
      }
    }

    console.log("✅ REGISTRO COMPLETADO EXITOSAMENTE");
    return {
      success: true,
      user: user,
      uid: user.uid,
      mensaje: "Registro exitoso. Redirigiendo a dashboard..."
    };

  } catch (error) {
    console.error("❌ Error en registro:", error);
    
    // Mapear errores de Firebase a mensajes amigables
    const errorMessages = {
      "auth/email-already-in-use": "Este email ya está registrado",
      "auth/invalid-email": "Email inválido",
      "auth/weak-password": "Contraseña muy débil (mínimo 6 caracteres)",
      "auth/missing-email": "Email es requerido",
      "auth/missing-password": "Contraseña es requerida"
    };

    const mensaje = errorMessages[error.code] || error.message;
    
    return {
      success: false,
      error: error.code,
      mensaje: mensaje
    };
  }
}

// ============ CARGAR DATOS PRE-LLENADOS ============
/**
 * Carga datos de sesión anterior (si vienen de contratacion-plan.html)
 */
export function cargarDatosPreLlenados() {
  try {
    const datosGuardados = sessionStorage.getItem("gravecare_registro_datos");
    if (datosGuardados) {
      return JSON.parse(datosGuardados);
    }
    return null;
  } catch (error) {
    console.error("Error cargando datos pre-llenados:", error);
    return null;
  }
}

/**
 * Guarda datos de formulario en sesión para persistencia
 */
export function guardarDatosEnSesion(datos) {
  try {
    sessionStorage.setItem("gravecare_registro_datos", JSON.stringify(datos));
  } catch (error) {
    console.error("Error guardando datos en sesión:", error);
  }
}

/**
 * Limpia datos de sesión después de registro exitoso
 */
export function limpiarDatosEnSesion() {
  sessionStorage.removeItem("gravecare_registro_datos");
}
