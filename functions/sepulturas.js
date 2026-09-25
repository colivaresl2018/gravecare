/**
 * SINCRONIZACIÓN DE SEPULTURAS - GraveCare
 *
 * Reemplaza la lógica vieja (onPagoCreated/onPagoCompletado + planes falsos
 * basico/premium/vip) que nunca se ejecutaba porque escuchaba la colección
 * "pagos", que nadie escribe. El flujo real de checkout escribe en "ordenes"
 * (resumen-pago.html), así que este trigger escucha ahí.
 *
 * También corrige el destino: la versión vieja guardaba un array
 * "sepulturas" dentro de usuarios/{uid} (campo plano). El portal de
 * operaciones (mapa.html) lee la SUBCOLECCIÓN usuarios/{uid}/sepulturas/{id}
 * vía collectionGroup — este archivo escribe ahí, que es lo que de verdad
 * se lee.
 *
 * Se dispara en CUALQUIER escritura de una orden (creación o actualización)
 * porque el usuarioId puede llegar en momentos distintos según el flujo:
 * - Cliente ya logueado al pagar: resumen-pago.html ya trae usuarioId.
 * - Cliente invitado: usuarioId recién llega cuando pasa por registro.html.
 * Usar el mismo ID de documento que la orden (ordenId) para la sepultura
 * hace que la función sea segura de re-ejecutar (idempotente): si corre
 * dos veces para la misma orden, solo actualiza el mismo documento.
 */

const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Meses entre visitas según el plan (12 visitas/año = cada 1 mes, etc.)
// Coherente con MESES_ENTRE_COBROS de oneclick.js.
const MESES_ENTRE_VISITAS = {"12": 1, "6": 2, "4": 3};

function calcularProximaVisita(plan) {
  const meses = MESES_ENTRE_VISITAS[plan];
  if (!meses) return null; // "spot" u otro valor: visita única, sin recurrencia
  const fecha = new Date();
  fecha.setMonth(fecha.getMonth() + meses);
  return admin.firestore.Timestamp.fromDate(fecha);
}

/**
 * Crea o actualiza la sepultura real (usuarios/{uid}/sepulturas/{ordenId})
 * a partir de los datos ya capturados en la orden. Reutilizable tanto por
 * el trigger automático como por una prueba manual.
 */
async function sincronizarSepulturaDesdeOrden(ordenId, orden) {
  if (!orden.usuarioId) {
    console.log(`[sincronizarSepultura] Orden ${ordenId} sin usuarioId todavía — se omite.`);
    return {omitido: true, motivo: "sin usuarioId"};
  }
  if (!orden.difunto || !orden.ubicacionSepultura) {
    console.log(`[sincronizarSepultura] Orden ${ordenId} sin difunto/ubicacionSepultura todavía — se omite.`);
    return {omitido: true, motivo: "datos de sepultura incompletos"};
  }

  const ubi = orden.ubicacionSepultura || {};
  const nombreDifunto =
    orden.difunto?.nombre ||
    `${orden.difunto?.nombres || ""} ${orden.difunto?.apellidoPaterno || ""}`.trim() ||
    "Ser querido";
  const nombreTitular =
    orden.titular?.nombre ||
    `${orden.titular?.nombres || ""} ${orden.titular?.apellidoPaterno || ""}`.trim() ||
    orden.emailCliente || "";

  const sepulturaRef = db
      .collection("usuarios").doc(orden.usuarioId)
      .collection("sepulturas").doc(ordenId);

  await sepulturaRef.set({
    ordenId: ordenId,
    // mapa.html (gravecare-operaciones) espera estos dos como texto plano,
    // no como el objeto anidado que viene en la orden.
    difunto: nombreDifunto,
    cliente: nombreTitular,
    difuntoDatos: orden.difunto,
    titularDatos: orden.titular || null,
    nombre: nombreDifunto,
    cementerio: ubi.cementerio || orden.cementerio || "Por definir",
    sector: ubi.sector || "",
    patio: ubi.patio || "",
    numero: ubi.numeroSepultura || ubi.numero || "",
    numeroSepultura: ubi.numeroSepultura || ubi.numero || "",
    referencias: ubi.referencias || "",
    plan: orden.plan || null,
    planNombre: orden.planNombre || null,
    frecuencia: orden.frecuencia || null,
    nivel: orden.nivel || null,
    esSpot: orden.plan === "spot",
    estado: "Activa",
    // coordenadas: las completa el staff manualmente en mapa.html
    // (agregarSepultura) la primera vez que ubican la sepultura en el mapa;
    // no se pisan aquí si ya existen (merge:true + no se incluye la clave
    // cuando coordenadas es null la primera vez).
    proximaVisita: calcularProximaVisita(orden.plan),
    actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
  }, {merge: true});

  console.log(`[sincronizarSepultura] OK -> usuarios/${orden.usuarioId}/sepulturas/${ordenId}`);
  return {omitido: false, usuarioId: orden.usuarioId, sepulturaId: ordenId};
}

// ============================================================================
// TRIGGER: se dispara en cada creación/actualización de una orden.
// ============================================================================
exports.onOrdenEscrita = onDocumentWritten("ordenes/{ordenId}", async (event) => {
  const ordenId = event.params.ordenId;
  const despues = event.data?.after?.data();

  if (!despues) {
    // La orden fue eliminada — no hay nada que sincronizar.
    return;
  }

  try {
    await sincronizarSepulturaDesdeOrden(ordenId, despues);
  } catch (err) {
    console.error(`[onOrdenEscrita] Error sincronizando orden ${ordenId}:`, err);
  }
});

module.exports.sincronizarSepulturaDesdeOrden = sincronizarSepulturaDesdeOrden;
