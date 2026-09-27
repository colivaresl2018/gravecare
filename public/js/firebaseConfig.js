/**
 * FIREBASECONFIG.JS - Configuración centralizada de Firebase (SDK Modular v10+)
 * UBICACIÓN: /js/firebaseConfig.js
 * 
 * Este es el ÚNICO archivo de configuración Firebase.
 * Todos los demás importan de aquí.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

// ============ CONFIGURACIÓN FIREBASE ============
const firebaseConfig = {
  apiKey: "AIzaSyAthgIWiVPDuscljVjQRAX-vIeUYLbrSC0",
  authDomain: "gravecare-2e8d2.firebaseapp.com",
  projectId: "gravecare-2e8d2",
  storageBucket: "gravecare-2e8d2.firebasestorage.app",
  messagingSenderId: "160012946248",
  appId: "1:160012946248:web:8c3e73100f1e92c485c17d"
};

// ============ INICIALIZAR FIREBASE ============
const app = initializeApp(firebaseConfig);

// ============ EXPORTAR SERVICIOS ============
export default app;
export const auth = getAuth(app);
export const db = getFirestore(app);
// getStorage(app) SIN el bucket explícito construye la URL de subida con
// el patrón antiguo {projectId}.appspot.com en vez de usar storageBucket
// de arriba (gravecare-2e8d2.firebasestorage.app, el formato nuevo). Ese
// bucket .appspot.com nunca existió para este proyecto (gsutil lo confirma
// con "404 The specified bucket does not exist"), así que cualquier
// subida a Storage desde este archivo fallaría del mismo modo que en
// gravecare-operaciones: el navegador lo reporta como error de CORS
// porque una petición a un bucket inexistente nunca trae los headers
// CORS esperados, aunque el bucket real sí los tenga bien configurados.
export const storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);

console.log('✅ Firebase inicializado correctamente');
