/**
 * SINCRONIZACIÓN staff/{uid} → Custom Claims de Firebase Auth
 *
 * Por qué existe esta función:
 * storage.rules necesitaba verificar si el usuario que sube una foto es
 * staff activo, consultando el documento staff/{uid} en Firestore con
 * firestore.exists()/firestore.get() (reglas cruzadas Storage↔Firestore).
 * En la práctica esa sintaxis (/databases/(default)/documents/...) falla
 * de forma intermitente tanto en el Simulador de reglas como en producción
 * real — es un bug conocido y sin fecha de arreglo por parte de Firebase
 * (ver github.com/firebase/firebase-tools/issues/5251 y /issues/2067).
 * Cada intento de subida fallaba con storage/unauthorized aunque el
 * documento staff/{uid} existiera y tuviera activo: true.
 *
 * La solución estable es NO depender de esa consulta cruzada: en su lugar,
 * esta función mantiene sincronizado un Custom Claim (staffActivo) en el
 * propio token de autenticación del usuario cada vez que su documento
 * staff/{uid} se crea, actualiza o borra. storage.rules entonces solo lee
 * request.auth.token.staffActivo, que ya viene incluido en el token sin
 * ninguna consulta adicional — más rápido y sin el bug de reglas cruzadas.
 *
 * Importante: el cliente debe refrescar su token (getIdToken(true)) para
 * que el nuevo claim llegue al navegador. requireStaffAccess(), en
 * public/js/portal-common.js, ya llama a user.getIdToken(true) cada vez
 * que valida el acceso a una página — es decir, en cada carga de página
 * del portal — así que el claim queda al día automáticamente sin pedirle
 * a nadie que cierre sesión manualmente.
 */

const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Sincroniza el claim staffActivo para TODO el staff existente en una sola
 * pasada. onStaffEscrito (más abajo) solo dispara con escrituras nuevas a
 * partir de que se despliega — los documentos staff/{uid} creados antes de
 * este cambio (como el tuyo y el de rravellos) no generan ese evento
 * retroactivamente, así que sin esta función manual seguirían sin el claim
 * hasta la próxima vez que alguien edite ese documento.
 *
 * Uso: llamar una sola vez, logueado como administrador, desde la consola
 * del navegador en cualquier página del portal (ya tiene Firebase cargado):
 *
 *   const fn = firebase.functions().httpsCallable('sincronizarStaffExistente');
 *   const r = await fn();
 *   console.log(r.data);
 *
 * o, más simple, con el SDK modular ya importado en la página:
 *   import { getFunctions, httpsCallable } from
 *     "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";
 *   const fn = httpsCallable(getFunctions(app), "sincronizarStaffExistente");
 *   const r = await fn();
 *   console.log(r.data);
 */
exports.sincronizarStaffExistente = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const db = admin.firestore();
  const snap = await db.collection("staff").get();

  const resultados = [];
  for (const doc of snap.docs) {
    const uid = doc.id;
    const activo = doc.data().activo === true;
    try {
      await admin.auth().setCustomUserClaims(uid, {staffActivo: activo});
      resultados.push({uid, activo, ok: true});
    } catch (error) {
      resultados.push({uid, activo, ok: false, error: error.message});
    }
  }

  return {total: resultados.length, resultados};
});

exports.onStaffEscrito = onDocumentWritten("staff/{uid}", async (event) => {
  const uid = event.params.uid;
  const despues = event.data && event.data.after ? event.data.after.data() : null;

  try {
    if (!despues) {
      // El documento staff/{uid} se borró: quita el claim por completo.
      await admin.auth().setCustomUserClaims(uid, {staffActivo: null});
      console.log(`staffActivo removido para ${uid} (documento eliminado)`);
      return;
    }

    const activo = despues.activo === true;

    await admin.auth().setCustomUserClaims(uid, {staffActivo: activo});
    console.log(`staffActivo=${activo} sincronizado para ${uid}`);
  } catch (error) {
    // Un UID que no existe en Auth (documento staff creado a mano con un
    // ID inválido, por ejemplo) no debe tumbar la función — solo registrar.
    console.error(`No se pudo sincronizar staffActivo para ${uid}:`, error.message);
  }
});
