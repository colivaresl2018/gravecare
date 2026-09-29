// build: 20260925222714
/**
 * INTEGRACIÓN TRANSBANK WEBPAY PLUS - GraveCare
 *
 * Flujo:
 * 1. El navegador llama a crearTransaccionWebpay con el ID de la orden
 *    (NUNCA con el monto — el monto se lee de Firestore, no del cliente,
 *    para que nadie pueda pagar $1 modificando el request).
 * 2. Esta función crea la transacción en Transbank y devuelve {url, token}.
 * 3. El navegador arma un <form method="POST"> hacia esa url con el token
 *    y lo envía (Transbank exige que sea POST, no un simple redirect).
 * 4. Transbank redirige de vuelta a confirmarTransaccionWebpay (returnUrl).
 * 5. Esta función confirma el pago (commit), actualiza la orden en
 *    Firestore y redirige al navegador a una página de resultado.
 */

const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const {
  WebpayPlus,
  Options,
  IntegrationCommerceCodes,
  IntegrationApiKeys,
  Environment,
} = require("transbank-sdk");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// ============================================================================
// CONFIGURACIÓN: Integración (pruebas) vs Producción
// ============================================================================
// Mientras Transbank no te entregue tu commerceCode/apiKey de PRODUCCIÓN,
// deja USE_INTEGRACION = true: usa las credenciales de prueba oficiales de
// Transbank (tarjetas de prueba, sin cobros reales).
//
// Cuando tengas tus credenciales reales, cambia a false y define los
// secrets con:
//   firebase functions:secrets:set TBK_COMMERCE_CODE
//   firebase functions:secrets:set TBK_API_KEY
const USE_INTEGRACION = true;

const TBK_COMMERCE_CODE = defineSecret("TBK_COMMERCE_CODE");
const TBK_API_KEY = defineSecret("TBK_API_KEY");

function obtenerOptions() {
  if (USE_INTEGRACION) {
    return new Options(
        IntegrationCommerceCodes.WEBPAY_PLUS,
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

// Dominios desde los que se puede llamar a estas funciones. Incluye el
// dominio final y las URLs por defecto de Firebase Hosting (útiles para
// probar antes de que gravecare.cl esté apuntando aquí, o si se prueba
// directo desde *.web.app).
const ALLOWED_ORIGINS = [
  "https://gravecare.cl",
  "https://www.gravecare.cl",
  "https://gravecare-2e8d2.web.app",
  "https://gravecare-2e8d2.firebaseapp.com",
];
// Se usa como último recurso solo para construir URLs de redirección cuando
// no se puede determinar el origen real (ver resolverSiteUrl).
const SITE_URL_POR_DEFECTO = "https://gravecare.cl";

// CORS: refleja el origen de la llamada solo si está en la lista permitida.
function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

// Determina a qué dominio devolver al navegador. Usa el origen guardado en
// la orden (el mismo desde el que se inició el pago) para no perder la
// sesión/localStorage al volver; si no hay dato, cae al valor por defecto.
function resolverSiteUrl(orden) {
  return orden && ALLOWED_ORIGINS.includes(orden.origenSitio) ?
    orden.origenSitio : SITE_URL_POR_DEFECTO;
}

// ============================================================================
// 1) CREAR TRANSACCIÓN
// POST { ordenId: string }  ->  { url, token }
// ============================================================================
exports.crearTransaccionWebpay = onRequest(
    {secrets: [TBK_COMMERCE_CODE, TBK_API_KEY]},
    async (req, res) => {
      setCors(req, res);
      if (req.method === "OPTIONS") {
        return res.status(204).send("");
      }
      if (req.method !== "POST") {
        return res.status(405).json({error: "Método no permitido"});
      }

      try {
        const {ordenId, cuotas} = req.body;
        if (!ordenId) {
          return res.status(400).json({error: "Falta ordenId"});
        }
        
        // cuotas: número específico (1, 3, 6, 12) o undefined (todas las cuotas que el banco ofrezca)
        // Si viene indefinido, null permite que Transbank ofrezca todas.
        const instalments = cuotas ? [cuotas] : null;

        // El monto SIEMPRE se lee desde Firestore, nunca del request.
        const ordenRef = db.collection("ordenes").doc(ordenId);
        const ordenSnap = await ordenRef.get();
        if (!ordenSnap.exists) {
          return res.status(404).json({error: "Orden no encontrada"});
        }
        const orden = ordenSnap.data();
        // El total NUNCA se guarda como "orden.total" — resumen-pago.html lo
        // escribe como "precioNumerico" (todos los flujos) o, si viene de un
        // registro más antiguo, anidado en "valores.total".
        const amount = orden.precioNumerico || orden.valores?.total;
        if (!amount || amount <= 0) {
          return res.status(400).json({error: "La orden no tiene un total válido"});
        }

        const buyOrder = ordenId.slice(0, 26); // Transbank limita buyOrder a 26 caracteres
        const sessionId = ordenId;
        const returnUrl = `${req.protocol}://${req.get("host")}/confirmarTransaccionWebpay`;

        const tx = new WebpayPlus.Transaction(obtenerOptions());
        // Parámetro de cuotas:
        // - Si cuotas viene desde el cliente: [cuotas] (ej: [3] para 3 cuotas)
        // - Si no viene o es 1: null (permite que Transbank ofrezca todas las opciones)
        // El cliente puede cambiar las cuotas en la pantalla de Transbank.
        const response = await tx.create(buyOrder, sessionId, amount, returnUrl, instalments);

        // Guarda el token en la orden para poder cruzarlo cuando Transbank
        // redirija de vuelta.
        const origenPermitido = ALLOWED_ORIGINS.includes(req.headers.origin) ?
          req.headers.origin : SITE_URL_POR_DEFECTO;

        await ordenRef.update({
          webpayToken: response.token,
          webpayEstado: "iniciado",
          webpayCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
          // Dominio desde el que se inició el pago, para volver ahí mismo
          // en confirmarTransaccionWebpay (evita perder localStorage).
          origenSitio: origenPermitido,
        });

        return res.status(200).json({url: response.url, token: response.token});
      } catch (err) {
        console.error("[crearTransaccionWebpay] Error:", err);
        return res.status(500).json({error: "No se pudo crear la transacción"});
      }
    },
);

// ============================================================================
// 2) CONFIRMAR TRANSACCIÓN (returnUrl de Transbank)
// Transbank redirige aquí por POST (o GET si el pago fue exitoso sin
// reintentos). Puede venir token_ws (pago completado o rechazado) o
// TBK_TOKEN (usuario abortó antes de pagar).
// ============================================================================
exports.confirmarTransaccionWebpay = onRequest(
    {secrets: [TBK_COMMERCE_CODE, TBK_API_KEY]},
    async (req, res) => {
      const params = {...req.query, ...req.body};
      const token = params.token_ws;
      const tokenAbortado = params.TBK_TOKEN;

      // Caso: el usuario canceló el pago antes de terminar.
      if (!token && tokenAbortado) {
        let siteUrl = SITE_URL_POR_DEFECTO;
        try {
          const ordenSnap = await db
              .collection("ordenes")
              .where("webpayToken", "==", tokenAbortado)
              .limit(1)
              .get();
          if (!ordenSnap.empty) {
            const ordenData = ordenSnap.docs[0].data();
            siteUrl = resolverSiteUrl(ordenData);
            await ordenSnap.docs[0].ref.update({webpayEstado: "abortado_por_usuario"});
          }
        } catch (err) {
          console.error("[confirmarTransaccionWebpay] Error registrando abandono:", err);
        }
        return res.redirect(302, `${siteUrl}/resumen-pago.html?estado=cancelado`);
      }

      if (!token) {
        return res.status(400).send("Falta token_ws");
      }

      try {
        const tx = new WebpayPlus.Transaction(obtenerOptions());
        const response = await tx.commit(token);

        const ordenRef = db.collection("ordenes").doc(response.buy_order);
        const ordenSnapActual = await ordenRef.get();
        const siteUrl = resolverSiteUrl(ordenSnapActual.data());
        const aprobado = response.response_code === 0;

        await ordenRef.update({
          // "estado" es el campo que leen ordenes.html, sepulturas.html y
          // onOrdenEscrita (sepulturas.js) — debe reflejar el pago real,
          // no solo el campo específico de Webpay.
          estado: aprobado ? "pagado" : "rechazado",
          webpayEstado: aprobado ? "pagado" : "rechazado",
          webpayResponseCode: response.response_code,
          webpayAuthorizationCode: response.authorization_code || null,
          webpayAmount: response.amount,
          webpayCardLast4: response.card_detail && response.card_detail.card_number ?
            response.card_detail.card_number : null,
          webpayTransactionDate: response.transaction_date || null,
          webpayConfirmedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const destino = aprobado ?
          `${siteUrl}/confirmacion.html?orden=${response.buy_order}` :
          `${siteUrl}/resumen-pago.html?estado=rechazado&orden=${response.buy_order}`;

        return res.redirect(302, destino);
      } catch (err) {
        console.error("[confirmarTransaccionWebpay] Error confirmando pago:", err);
        return res.redirect(302, `${SITE_URL_POR_DEFECTO}/resumen-pago.html?estado=error`);
      }
    },
);
