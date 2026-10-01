/**
 * CLOUD FUNCTIONS - GraveCare
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ============================================================================
// ENDPOINT HTTP: prueba manual de sincronización de sepultura para una orden
// ============================================================================
exports.testSincronizarSepultura = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Usuario no autenticado");
  }

  const { ordenId } = data;
  if (!ordenId) {
    throw new functions.https.HttpsError("invalid-argument", "Falta ordenId");
  }

  const ordenSnap = await db.collection("ordenes").doc(ordenId).get();
  if (!ordenSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Orden no encontrada");
  }

  const sepulturas = require("./sepulturas");
  try {
    return await sepulturas.sincronizarSepulturaDesdeOrden(ordenId, ordenSnap.data());
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// Triggers de sepulturas
const sepulturas = require("./sepulturas");
exports.onOrdenEscrita = sepulturas.onOrdenEscrita;

// Transbank Webpay Plus
const transbank = require("./transbank");
exports.crearTransaccionWebpay = transbank.crearTransaccionWebpay;
exports.confirmarTransaccionWebpay = transbank.confirmarTransaccionWebpay;

// Transbank Webpay Oneclick
const oneclick = require("./oneclick");
exports.iniciarInscripcionOneclick = oneclick.iniciarInscripcionOneclick;
exports.confirmarInscripcionOneclick = oneclick.confirmarInscripcionOneclick;
exports.cargarOneclick = oneclick.cargarOneclick;
exports.reversarOneclick = oneclick.reversarOneclick;

// Contacto
const contacto = require("./contacto");
exports.enviarContacto = contacto.enviarContacto;

// Contratos
const contrato = require("./contrato");
exports.generarContratoAlPagar = contrato.generarContratoAlPagar;

// Permisos Staff
const staffClaims = require("./staffClaims");
exports.onStaffEscrito = staffClaims.onStaffEscrito;
exports.sincronizarStaffExistente = staffClaims.sincronizarStaffExistente;