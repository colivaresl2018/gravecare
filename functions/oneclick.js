// build: 20260925222714
/**
 * INTEGRACIÓN TRANSBANK ONECLICK MALL - GraveCare
 * Cobro recurrente para Planes 12 / 6 / 4 (Spot usa Webpay Plus, ver transbank.js)
 *
 * Flujo de INSCRIPCIÓN (una sola vez, al contratar el plan):
 * 1. Navegador llama a iniciarInscripcionOneclick con { ordenId }
 * 2. Esta función llama a Oneclick.MallInscription.start() y devuelve
 *    { token, url_webpay }
 * 3. Navegador redirige (POST) a url_webpay con TBK_TOKEN = token
 * 4. Transbank redirige de vuelta a confirmarInscripcionOneclick
 * 5. Esta función llama a inscription.finish(token), guarda tbk_user en la
 *    orden, y hace el PRIMER cobro inmediatamente (la primera visita)
 *
 * Flujo de COBROS SIGUIENTES (automático, sin que el cliente haga nada):
 * 6. cobrarSuscripcionesOneclick corre todos los días (Cloud Scheduler) y
 *    cobra a quienes les corresponda visita ese día, según la frecuencia
 *    de su plan (Plan 12 = cada mes, Plan 6 = cada 2 meses, Plan 4 = cada
 *    3 meses — 12 visitas repartidas en el año).
 */

const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const {
  Oneclick,
  Options,
  IntegrationCommerceCodes,
  IntegrationApiKeys,
  Environment,
  TransactionDetail,
} = require("transbank-sdk");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// ============================================================================
// CONFIGURACIÓN (misma lógica que transbank.js — ver ese archivo para el
// paso a producción con TBK_COMMERCE_CODE / TBK_API_KEY).
// ============================================================================
const USE_INTEGRACION = true;
const TBK_COMMERCE_CODE = defineSecret("TBK_COMMERCE_CODE");
const TBK_API_KEY = defineSecret("TBK_API_KEY");

function obtenerOptions() {
  if (USE_INTEGRACION) {
    return new Options(
        IntegrationCommerceCodes.ONECLICK_MALL,
        IntegrationApiKeys.WEBPAY,
        Environment.Integration,
    );
  }
  return new Options(
      TBK_COMMERCE_CODE.value(),
      TBK_API_KEY.value(),
      Environment.Production,
  );
}

const SITE_URL = "https://gravecare.cl"; // Ajustar al dominio real

// Meses entre cada cobro, según el plan (12 visitas al año repartidas).
const MESES_ENTRE_COBROS = {"12": 1, "6": 2, "4": 3};

function setCors(res) {
  res.set("Access-Control-Allow-Origin", SITE_URL);
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

// ============================================================================
// 1) INICIAR INSCRIPCIÓN
// POST { ordenId: string }  ->  { token, url_webpay }
// ============================================================================
exports.iniciarInscripcionOneclick = onRequest(
    {secrets: [TBK_COMMERCE_CODE, TBK_API_KEY]},
    async (req, res) => {
      setCors(res);
      if (req.method === "OPTIONS") return res.status(204).send("");
      if (req.method !== "POST") {
        return res.status(405).json({error: "Método no permitido"});
      }

      try {
        const {ordenId} = req.body;
        if (!ordenId) {
          return res.status(400).json({error: "Falta ordenId"});
        }

        const ordenRef = db.collection("ordenes").doc(ordenId);
        const ordenSnap = await ordenRef.get();
        if (!ordenSnap.exists) {
          return res.status(404).json({error: "Orden no encontrada"});
        }
        const orden = ordenSnap.data();

        if (!MESES_ENTRE_COBROS[orden.plan]) {
          return res.status(400).json({
            error: "Esta orden no corresponde a un plan recurrente (12/6/4)",
          });
        }
        // El email del cliente se guarda anidado en titular.email
        // (contratacion-plan.html), nunca como campo plano "orden.email".
        const emailCliente = orden.titular?.email || orden.emailCliente || orden.email;
        if (!emailCliente) {
          return res.status(400).json({error: "La orden no tiene email"});
        }

        const responseUrl = `${req.protocol}://${req.get("host")}/confirmarInscripcionOneclick`;
        const inscription = new Oneclick.MallInscription(obtenerOptions());
        const response = await inscription.start(ordenId, emailCliente, responseUrl);

        await ordenRef.update({
          oneclickToken: response.token,
          oneclickEstado: "inscripcion_iniciada",
        });

        return res.status(200).json({
          token: response.token,
          url_webpay: response.url_webpay,
        });
      } catch (err) {
        console.error("[iniciarInscripcionOneclick] Error:", err);
        return res.status(500).json({error: "No se pudo iniciar la inscripción"});
      }
    },
);

// ============================================================================
// 2) CONFIRMAR INSCRIPCIÓN (responseUrl de Transbank)
// Transbank redirige aquí por POST con TBK_TOKEN.
// Al confirmar, se guarda tbk_user y se hace el PRIMER cobro (primera visita).
// ============================================================================
exports.confirmarInscripcionOneclick = onRequest(
    {secrets: [TBK_COMMERCE_CODE, TBK_API_KEY]},
    async (req, res) => {
      const token = req.body.TBK_TOKEN || req.query.TBK_TOKEN;

      if (!token) {
        // El usuario canceló la inscripción antes de completarla.
        return res.redirect(302, `${SITE_URL}/suscribirme-Plan.html?estado=inscripcion_cancelada`);
      }

      // ordenId fue enviado como "username" en el start() — lo recuperamos
      // buscando la orden que tenga este token guardado.
      let ordenRef;
      let ordenId;
      try {
        const ordenSnap = await db
            .collection("ordenes")
            .where("oneclickToken", "==", token)
            .limit(1)
            .get();
        if (ordenSnap.empty) {
          return res.status(404).send("Orden no encontrada para este token");
        }
        ordenRef = ordenSnap.docs[0].ref;
        ordenId = ordenSnap.docs[0].id;
      } catch (err) {
        console.error("[confirmarInscripcionOneclick] Error buscando orden:", err);
        return res.status(500).send("Error interno");
      }

      try {
        const inscription = new Oneclick.MallInscription(obtenerOptions());
        const response = await inscription.finish(token);

        if (response.response_code !== 0) {
          await ordenRef.update({oneclickEstado: "inscripcion_rechazada"});
          return res.redirect(302, `${SITE_URL}/suscribirme-Plan.html?estado=inscripcion_rechazada`);
        }

        await ordenRef.update({
          // "estado" es el campo que leen ordenes.html, sepulturas.html y
          // onOrdenEscrita (sepulturas.js) — debe reflejar el pago real,
          // no solo el campo específico de Oneclick.
          estado: "pagado",
          oneclickEstado: "inscrito",
          oneclickTbkUser: response.tbk_user,
          oneclickCardType: response.card_type,
          oneclickCardNumber: response.card_number,
          oneclickInscritoAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Primer cobro inmediato (primera visita) + agenda el próximo.
        await cobrarUnaVisita(ordenId, ordenRef);

        return res.redirect(302, `${SITE_URL}/confirmacion.html?orden=${ordenId}&suscripcion=activa`);
      } catch (err) {
        console.error("[confirmarInscripcionOneclick] Error confirmando:", err);
        await ordenRef.update({oneclickEstado: "error_confirmacion"});
        return res.redirect(302, `${SITE_URL}/suscribirme-Plan.html?estado=error`);
      }
    },
);

// ============================================================================
// FUNCIÓN COMPARTIDA: cobra UNA visita de una orden ya inscrita y agenda
// la fecha del próximo cobro según la frecuencia del plan.
// ============================================================================
async function cobrarUnaVisita(ordenId, ordenRef) {
  const ordenSnap = await ordenRef.get();
  const orden = ordenSnap.data();

  // ⚠️ precioUnitario debe ser el valor POR VISITA (ej. $38.990), NO el
  // total del año (ej. $467.880). Si tu resumen-pago.html hoy solo guarda
  // el total ya multiplicado, hay que agregar este campo aparte al crear
  // la orden.
  const precioUnitario = orden.precioUnitario;
  const precioExtra = orden.precioRamoAdicional || 0;
  const extras = orden.cantidadRamosAdicionales || 0;
  const montoVisita = precioUnitario + (extras * precioExtra);

  const buyOrder = `${ordenId}-${Date.now()}`.slice(0, 26);
  const details = [
    new TransactionDetail(montoVisita, TBK_COMMERCE_CODE.value() || IntegrationCommerceCodes.ONECLICK_MALL, buyOrder),
  ];

  const transaction = new Oneclick.MallTransaction(obtenerOptions());
  const response = await transaction.authorize(
      ordenId, // username, el mismo usado en inscription.start()
      orden.oneclickTbkUser,
      buyOrder,
      details,
  );

  const detalle = response.details && response.details[0];
  const aprobado = detalle && detalle.response_code === 0;

  const mesesSiguiente = MESES_ENTRE_COBROS[orden.plan] || 1;
  const proximoCobro = new Date();
  proximoCobro.setMonth(proximoCobro.getMonth() + mesesSiguiente);

  await ordenRef.update({
    ultimoCobroEstado: aprobado ? "aprobado" : "rechazado",
    ultimoCobroResponseCode: detalle ? detalle.response_code : null,
    ultimoCobroFecha: admin.firestore.FieldValue.serverTimestamp(),
    ultimoCobroMonto: montoVisita,
    visitasCobradas: admin.firestore.FieldValue.increment(1),
    proximoCobroFecha: admin.firestore.Timestamp.fromDate(proximoCobro),
  });

  return aprobado;
}

// ============================================================================
// 3) COBRO PROGRAMADO — corre todos los días a las 09:00 (America/Santiago)
// Cobra a todas las órdenes inscritas cuya proximoCobroFecha ya llegó.
// ============================================================================
exports.cobrarSuscripcionesOneclick = onSchedule(
    {
      schedule: "0 9 * * *",
      timeZone: "America/Santiago",
      secrets: [TBK_COMMERCE_CODE, TBK_API_KEY],
    },
    async () => {
      const ahora = admin.firestore.Timestamp.now();
      const pendientes = await db
          .collection("ordenes")
          .where("oneclickEstado", "==", "inscrito")
          .where("proximoCobroFecha", "<=", ahora)
          .get();

      console.log(`[cobrarSuscripcionesOneclick] ${pendientes.size} cobro(s) pendiente(s)`);

      for (const doc of pendientes.docs) {
        try {
          await cobrarUnaVisita(doc.id, doc.ref);
        } catch (err) {
          console.error(`[cobrarSuscripcionesOneclick] Error cobrando orden ${doc.id}:`, err);
          await doc.ref.update({ultimoCobroEstado: "error", ultimoCobroError: String(err)});
        }
      }
    },
);
