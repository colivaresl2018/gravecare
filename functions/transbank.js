const functions = require('firebase-functions');
const admin = require('firebase-admin');
const handleCors = require('./cors');

// SDK oficial de Transbank
const { WebpayPlus, Options, Environment, IntegrationCommerceCodes, IntegrationApiKeys } = require('transbank-sdk');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Credenciales de Transbank (Ambiente Integración)
const COMMERCE_CODE = process.env.TRANSBANK_COMMERCE_CODE || IntegrationCommerceCodes.WEBPAY_PLUS;
const API_KEY = process.env.TRANSBANK_API_KEY || IntegrationApiKeys.WEBPAY;
const ENVIRONMENT = Environment.Integration;

// Instanciar cliente de transacciones
const tx = new WebpayPlus.Transaction(new Options(COMMERCE_CODE, API_KEY, ENVIRONMENT));

// ============================================================================
// 1. CREAR TRANSACCIÓN WEBPAY
// ============================================================================
exports.crearTransaccionWebpay = functions.https.onRequest(async (req, res) => {
    if (handleCors(req, res)) return;

    try {
        const { ordenId, cuotas } = req.body;

        if (!ordenId) {
            return res.status(400).json({ error: 'ordenId es requerido' });
        }

        // Buscar la orden en Firestore
        const ordenRef = db.collection('ordenes').doc(ordenId);
        const ordenSnap = await ordenRef.get();

        if (!ordenSnap.exists) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }

        const orden = ordenSnap.data();
        const montoTotal = Math.round(Number(orden.montoTotal || orden.monto || orden.precioNumerico || 0));

        if (!montoTotal || montoTotal <= 0) {
            return res.status(400).json({ error: 'Monto total inválido' });
        }

        // Transbank exige máximo 26 caracteres alfanuméricos para buyOrder
        const timestamp = Date.now().toString().slice(-8);
        const idLimpio = ordenId.replace(/[^a-zA-Z0-9]/g, '').slice(-12);
        const buyOrder = `GC${idLimpio}${timestamp}`.slice(0, 26);

        // Session ID (máx 61 caracteres)
        const sessionId = `SES-${idLimpio}-${Date.now()}`.slice(0, 60);

        // URL de retorno desde variable de entorno o fallback a Cloud Run
        const returnUrl = process.env.CONFIRMATION_URL || 'https://confirmartransaccionwebpay-f4mre7bfoa-uc.a.run.app';

        console.log(`Iniciando Webpay: buyOrder=${buyOrder}, session=${sessionId}, monto=${montoTotal}`);

        const response = await tx.create(
            buyOrder,
            sessionId,
            montoTotal,
            returnUrl
        );

        console.log('Transacción creada en Transbank:', response);

        await ordenRef.update({
            transaccionWebpay: {
                buyOrder,
                sessionId,
                montoTotal,
                cuotas: cuotas || 1,
                estado: 'iniciada',
                fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
                token: response.token
            }
        });

        return res.json({
            success: true,
            redirect_url: `${response.url}?token_ws=${response.token}`,
            url: response.url,
            token: response.token
        });

    } catch (error) {
        console.error('Error en crearTransaccionWebpay:', error);
        return res.status(500).json({
            error: 'Error al crear la transacción',
            details: error.message
        });
    }
});

// ============================================================================
// 2. CONFIRMAR TRANSACCIÓN WEBPAY (Retorno bancario)
// ============================================================================
exports.confirmarTransaccionWebpay = functions.https.onRequest(async (req, res) => {
    // Al ser un redirect bancario (GET/POST desde Transbank), no requiere bloqueo CORS estricto
    const token = req.query.token_ws || req.body?.token_ws;
    const tbkToken = req.query.TBK_TOKEN || req.body?.TBK_TOKEN;

    if (tbkToken || !token) {
        return res.redirect('https://www.gravecare.cl/confirmacion.html?resultado=anulado');
    }

    try {
        console.log('Confirmando transacción con token:', token);

        const response = await tx.commit(token);
        console.log('Respuesta de Transbank commit:', response);

        const snapshot = await db.collection('ordenes')
            .where('transaccionWebpay.buyOrder', '==', response.buy_order)
            .limit(1)
            .get();

        let ordenDocId = '';

        if (!snapshot.empty) {
            const docRef = snapshot.docs[0].ref;
            ordenDocId = snapshot.docs[0].id;

            await docRef.update({
                'transaccionWebpay.estado': response.response_code === 0 ? 'aprobada' : 'rechazada',
                'transaccionWebpay.codigoAutorizacion': response.authorization_code,
                'transaccionWebpay.detalles': response,
                estado: response.response_code === 0 ? 'pagado' : 'pago_fallido',
                fechaPago: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        if (response.response_code === 0) {
            return res.redirect(`https://www.gravecare.cl/confirmacion.html?resultado=exito&orden=${ordenDocId}`);
        } else {
            return res.redirect(`https://www.gravecare.cl/confirmacion.html?resultado=rechazado&orden=${ordenDocId}`);
        }

    } catch (error) {
        console.error('Error al confirmar transacción:', error);
        return res.redirect('https://www.gravecare.cl/confirmacion.html?resultado=error');
    }
});