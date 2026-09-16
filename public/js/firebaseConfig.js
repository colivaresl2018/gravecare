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

// ============ CONFIGURACIÓN FIREBASE ============
const firebaseConfig = {
  apiKey: "AIzaSyAthgIWiVPDuscljVjQRAX-vIeUYLbrSC0",
  authDomain: "gravecare-2e8d2.firebaseapp.com",
  projectId: "gravecare-2e8d2",
  storageBucket: "gravecare-2e8d2.appspot.com",
  messagingSenderId: "160012946248",
  appId: "1:160012946248:web:8c3e73100f1e92c485c17d"
};

// ============ INICIALIZAR FIREBASE ============
const app = initializeApp(firebaseConfig);

// ============ EXPORTAR SERVICIOS ============
export default app;
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log('✅ Firebase inicializado correctamente');
