/**
 * AUTH.JS - Módulo de Autenticación para GraveCare (SDK MODULAR v10+)
 * Gestiona: Login, Logout, Sesión, Perfil de Usuario
 * UBICACIÓN: /js/auth.js
 */

import app from "./firebaseConfig.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { 
  getFirestore,
  doc, 
  getDoc, 
  setDoc,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ============ OBTENER SERVICIOS DE FIREBASE ============
export const auth = getAuth(app);
export const db = getFirestore(app);

// ============ GUARDAR/ACTUALIZAR PERFIL EN FIRESTORE ============
/**
 * Guarda o actualiza el perfil del usuario en Firestore
 * @param {Object} user - Objeto usuario de Firebase Auth
 */
async function updateUserProfile(user) {
  try {
    const userDocRef = doc(db, 'usuarios', user.uid);
    
    // Obtener datos existentes
    const userDocSnapshot = await getDoc(userDocRef);
    const existingData = userDocSnapshot.exists() ? userDocSnapshot.data() : {};

    // Guardar/Actualizar con merge (no sobrescribe datos existentes)
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || existingData.displayName || '',
      photoURL: user.photoURL || existingData.photoURL || '',
      lastLogin: serverTimestamp(),
      // Mantener campos existentes
      ...existingData
    }, { merge: true });

    console.log('✅ Perfil de usuario actualizado:', user.uid);
  } catch (error) {
    console.error('❌ Error al guardar perfil:', error);
  }
}

// ============ OBSERVAR ESTADO DE AUTENTICACIÓN ============
/**
 * Observa cambios en el estado de autenticación del usuario
 * @param {Function} callback - Función que recibe el usuario (null si no autenticado)
 */
export function observeAuthState(callback) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Usuario autenticado: Guardar/Actualizar en Firestore
      updateUserProfile(user);
    }
    callback(user);
  });
}

// ============ OBTENER PERFIL DEL USUARIO ============
/**
 * Obtiene el perfil completo del usuario desde Firestore
 * @param {String} uid - UID del usuario
 * @returns {Promise<Object>} Datos del usuario
 */
export async function getUserProfile(uid) {
  try {
    const userDocRef = doc(db, 'usuarios', uid);
    const userDocSnapshot = await getDoc(userDocRef);

    if (userDocSnapshot.exists()) {
      return userDocSnapshot.data();
    } else {
      console.warn('⚠️ Perfil de usuario no encontrado:', uid);
      return null;
    }
  } catch (error) {
    console.error('❌ Error al obtener perfil:', error);
    throw error;
  }
}

// ============ CERRAR SESIÓN ============
/**
 * Cierra la sesión del usuario autenticado
 */
export async function logoutUser() {
  try {
    await signOut(auth);
    sessionStorage.removeItem('gravecare_user');
    console.log('✅ Sesión cerrada correctamente');
  } catch (error) {
    console.error('❌ Error al cerrar sesión:', error);
    throw error;
  }
}

// ============ CREAR ESTRUCTURA DE SEPULTURAS ============
/**
 * Crea la subcollection de sepulturas para un usuario
 * Se llama automáticamente cuando el usuario se registra
 * @param {String} uid - UID del usuario
 */
export async function createSepulturasCollection(uid) {
  try {
    const sepulturaRef = doc(db, 'usuarios', uid, 'sepulturas', 'placeholder');
    await setDoc(sepulturaRef, {
      placeholder: true,
      createdAt: serverTimestamp()
    });
    console.log('✅ Colección de sepulturas creada:', uid);
  } catch (error) {
    console.error('❌ Error al crear sepulturas:', error);
  }
}
