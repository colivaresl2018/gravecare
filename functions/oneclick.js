const functions = require('firebase-functions');
const admin = require('firebase-admin');
const handleCors = require('./cors');
const { Oneclick, Options, Environment, IntegrationCommerceCodes, IntegrationApiKeys } = require('transbank-sdk');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Helper para cliente Oneclick Mall (soporta pruebas y producción)
function getOneclickClient() {
  const esProduccion = process.env.NODE_ENV === 'production' && process.env.TRANSBANK_ONECLICK_COMMERCE_CODE;

  const commerceCode = esProduccion 
    ? process.env.TRANSBANK_ONECLICK_COMMERCE_CODE 
    : (IntegrationCommerceCodes.ONECLICK_MALL || "597055555541");

  const apiKey = esProduccion 
    ? process.env.TRANSBANK_API_KEY 
    : (IntegrationApiKeys.WEBPAY || "579B532A7440BB0C9079DED94D31EA1615BACEB7");

  const environment = esProduccion 
    ? Environment.Production 
    : Environment.Integration;

  return new Oneclick.MallInscription(new Options(commerceCode, apiKey, environment));
}

// ============================================================================
// 1. INICIAR INSCRIPCIÓN ONECLICK
// ============================================================================
exports.iniciarInscripcionOneclick = functions.https.onRequest(async (req, res) => {
    if (handleCors(req, res)) return;

    try {
        const { ordenId, cuotas } = req.body || {};

        if (!ordenId) {
            return res.status(400).json({ error: 'ordenId es requerido' });
        }

        const ordenRef = db.collection('ordenes').doc(ordenId);
        const ordenSnap = await ordenRef.get();

        if (!ordenSnap.exists) {
            return res.status(404).json({ error: 'Orden no encontrada en Firestore' });
        }

        const orden = ordenSnap.data();

        // Parámetros limpios para Transbank
        const idLimpio = String(ordenId).replace(/[^a-zA-Z0-9]/g, '');
        const username = `GC_${idLimpio}`.substring(0, 35);
        const email = (orden.email || orden.emailCliente || orden.titular?.email || 'contacto@gravecare.cl').trim();
        const responseUrl = `https://gravecare.cl/confirmar-oneclick?ordenId=${ordenId}`;

        console.log(`[Oneclick Mall] Iniciando inscripción: username=${username}, email=${email}, returnUrl=${responseUrl}`);

        const inscription = getOneclickClient();
        const response = await inscription.start(username, email, responseUrl);
        console.log('[Oneclick Mall] Start exitoso:', response);

        await ordenRef.update({
            oneclickInscripcion: {
                username,
                email,
                estado: 'inscripcion_iniciada',
                tokenWpm: response.token,
                url: response.url_webpay,
                cuotasSolicitadas: cuotas || 1,
                fechaCreacion: admin.firestore.FieldValue.serverTimestamp()
            }
        });

        return res.json({
            success: true,
            redirect_url: response.url_webpay,
            token: response.token
        });

    } catch (error) {
        console.error('[Oneclick Mall] Error en iniciarInscripcionOneclick:', error);
        return res.status(500).json({
            error: 'Error al iniciar inscripción Oneclick',
            details: error.message || error.toString()
        });
    }
});

// ============================================================================
// 2. CONFIRMAR INSCRIPCIÓN ONECLICK
// ============================================================================
exports.confirmarInscripcionOneclick = functions.https.onRequest(async (req, res) => {
    if (handleCors(req, res)) return;

    try {
        const token = req.query.TBK_TOKEN || req.query.token || (req.body && (req.body.TBK_TOKEN || req.body.token));
        const ordenId = req.query.ordenId || req.query.orden || (req.body && req.body.ordenId);

        if (!token) {
            return res.status(400).json({ error: 'Token no proporcionado' });
        }

        console.log(`[Oneclick Mall] Confirmando inscripción con token: ${token}`);

        const inscription = getOneclickClient();
        const response = await inscription.finish(token);
        console.log('[Oneclick Mall] Finish exitoso:', response);

        const inscripcionExitosa = (response.response_code === 0);

        if (ordenId) {
            const ordenRef = db.collection('ordenes').doc(ordenId);
            
            // Actualización integral de la orden para activar disparadores de Firestore
            await ordenRef.update({
                oneclickInscripcion: {
                    estado: inscripcionExitosa ? 'inscripcion_completada' : 'inscripcion_rechazada',
                    tbk_user: response.tbk_user || null,
                    responseCode: response.response_code,
                    authorizationCode: response.authorization_code || null,
                    cardNumber: response.card_number || null,
                    cardType: response.card_type || null,
                    fechaConfirmacion: admin.firestore.FieldValue.serverTimestamp()
                },
                // Al marcar 'pagado' y 'pagoConfirmado: true', se dispara generarContratoAlPagar
                estado: inscripcionExitosa ? 'pagado' : 'error_inscripcion',
                pagoConfirmado: inscripcionExitosa,
                metodoPago: 'Oneclick',
                fechaPago: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        return res.json({
            success: inscripcionExitosa,
            response_code: response.response_code,
            tbk_user: response.tbk_user,
            card_number: response.card_number,
            message: inscripcionExitosa ? 'Inscripción y suscripción completada con éxito' : 'Inscripción rechazada'
        });

    } catch (error) {
        console.error('[Oneclick Mall] Error en confirmarInscripcionOneclick:', error);
        return res.status(500).json({
            success: false,
            error: 'Error interno al confirmar inscripción',
            details: error.message || error.toString()
        });
    }
});