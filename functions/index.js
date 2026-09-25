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
// existente (util para verificar sin esperar una compra real).
// ============================================================================
exports.testSincronizarSepultura = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Usuario no autenticado");
  }

  const {ordenId} = data;
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

const sepulturas = require("./sepulturas");
exports.onOrdenEscrita = sepulturas.onOrdenEscrita;

const transbank = require("./transbank");
exports.crearTransaccionWebpay = transbank.crearTransaccionWebpay;
exports.confirmarTransaccionWebpay = transbank.confirmarTransaccionWebpay;

const oneclick = require("./oneclick");
exports.iniciarInscripcionOneclick = oneclick.iniciarInscripcionOneclick;
exports.confirmarInscripcionOneclick = oneclick.confirmarInscripcionOneclick;
exports.cobrarSuscripcionesOneclick = oneclick.cobrarSuscripcionesOneclick;
