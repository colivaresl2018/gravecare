/**
 * Flujo de Recuperación de Contraseña mediante SMS (Firebase Phone Auth OTP)
 * Proyecto: GraveCare (gravecare.cl)
 */

import { auth } from "./firebaseConfig.js";
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  updatePassword 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { normalizeChileanPhone } from "./auth.js";

let confirmationResult = null;

/**
 * Inicializa el reCAPTCHA invisible para verificar la solicitud SMS.
 * @param {string} containerId - ID del contenedor HTML para reCAPTCHA
 * @param {Function} onSolved - Callback opcional al resolver
 */
export function initializeRecaptcha(containerId = "recaptcha-container", onSolved = null) {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
      callback: () => {
        if (typeof onSolved === "function") onSolved();
      },
      "expired-callback": () => {
        console.warn("reCAPTCHA ha expirado. Por favor reintenta.");
      }
    });
  }
  return window.recaptchaVerifier;
}

/**
 * Envía el código de verificación OTP por SMS al teléfono indicado.
 * @param {string} rawPhone - Número de teléfono ingresado (ej: 912345678 o +56912345678)
 * @returns {Promise<Object>}
 */
export async function sendOtpToPhone(rawPhone) {
  const formattedPhone = normalizeChileanPhone(rawPhone);
  if (!/^\+569\d{8}$/.test(formattedPhone)) {
    throw new Error("El número de teléfono debe ser un móvil chileno válido (+56 9 XXXX XXXX).");
  }

  const verifier = initializeRecaptcha("recaptcha-container");
  
  try {
    confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, verifier);
    return confirmationResult;
  } catch (error) {
    // Si falla por reCAPTCHA reseteado, limpiar y reintentar
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
    throw error;
  }
}

/**
 * Verifica el código OTP de 6 dígitos y actualiza la contraseña del usuario.
 * @param {string} otpCode - Código SMS de 6 dígitos
 * @param {string} newPassword - Nueva contraseña deseada
 * @returns {Promise<boolean>}
 */
export async function verifyOtpAndResetPassword(otpCode, newPassword) {
  if (!confirmationResult) {
    throw new Error("No existe una sesión de recuperación activa. Solicita un nuevo código SMS.");
  }

  if (!otpCode || otpCode.trim().length !== 6) {
    throw new Error("El código de verificación debe contener exactamente 6 dígitos.");
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error("La nueva contraseña debe tener al menos 6 caracteres.");
  }

  // 1. Validar el código OTP contra Firebase Auth
  const userCredential = await confirmationResult.confirm(otpCode.trim());
  const user = userCredential.user;

  // 2. Establecer la nueva contraseña
  await updatePassword(user, newPassword);

  return true;
}
