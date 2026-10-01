const functions = require('firebase-functions');
const admin = require('firebase-admin');
const handleCors = require('./cors');

// Importar correctamente transbank-sdk v6.0.0
const { WebpayOneClick, Environment } = require('transbank-sdk');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Credenciales Transbank (desde variables de entorno)
const COMMERCE_CODE = process.env.TRANSBANK_ONECLICK_COMMERCE || "597055555532";
const API_KEY = process.env.TRANSBANK_API_KEY || "579B532A7440BB0C9079DED94D31EA1615BACEB7";
const ENVIRONMENT = Environment.Integration;

exports.iniciarInscripcionOneclick = functions.https.onRequest(async (req, res) => {
    if (handleCors(req, res)) return;

    try {
        const { ordenId, cuotas } = req.body;

        if (!ordenId) {
            return res.status(400).json({ error: 'ordenId es requerido' });
        }

        // Obtener orden de Firestore
        const ordenRef = db.collection('ordenes').doc(ordenId);
        const ordenSnap = await ordenRef.get();

        if (!ordenSnap.exists) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }

        const orden = ordenSnap.data();
        const username = `GC-${ordenId}`;
        const email = orden.email || 'cliente@gravecare.cl';
        const responseUrl = `${process.env.FIREBASE_PUBLIC_URL || 'https://gravecare.cl'}/confirmar-oneclick?orden=${ordenId}`;

        console.log(`Iniciando inscripción Oneclick: username=${username}, email=${email}`);

        const response = await WebpayOneClick.Inscription.start(
            COMMERCE_CODE,
            API_KEY,
            ENVIRONMENT,
            username,
            email,
            responseUrl
        );

        console.log('Respuesta de inscripción Oneclick:', response);

        await db.collection('ordenes').doc(ordenId).update({
            oneclickInscripcion: {
                username,
                email,
                estado: 'inscripcion_iniciada',
                tokenWpm: response.token,
                url: response.url,
                fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
                cuotasSolicitadas: cuotas || 1
            }
        });

        return res.json({
            success: true,
            redirect_url: response.url,
            token: response.token
        });

    } catch (error) {
        console.error('Error en iniciarInscripcionOneclick:', error);
        return res.status(500).json({
            error: 'Error al iniciar inscripción Oneclick',
            details: error.message
        });
    }
});

exports.confirmarInscripcionOneclick = functions.https.onRequest(async (req, res) => {
    if (handleCors(req, res)) return;

    try {
        const { token, ordenId } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Token no proporcionado' });
        }

        console.log('Confirmando inscripción Oneclick con token:', token);

        const response = await WebpayOneClick.Inscription.finish(
            COMMERCE_CODE,
            API_KEY,
            ENVIRONMENT,
            token
        );

        console.log('Respuesta de confirmación Oneclick:', response);

        if (ordenId) {
            await db.collection('ordenes').doc(ordenId).update({
                oneclickInscripcion: {
                    estado: 'inscripcion_completada',
                    tbk_user: response.tbk_user,
                    responseCode: response.response_code,
                    authorizationCode: response.authorization_code,
                    cardNumber: response.card_number,
                    fechaConfirmacion: admin.firestore.FieldValue.serverTimestamp()
                },
                estado: 'oneclick_inscrito'
            });
        }

        return res.json({
            success: true,
            message: 'Inscripción completada correctamente',
            tbk_user: response.tbk_user,
            card_number: response.card_number
        });

    } catch (error) {
        console.error('Error en confirmarInscripcionOneclick:', error);
        return res.status(500).json({
            error: 'Error al confirmar inscripción Oneclick',
            details: error.message
        });
    }
});

exports.cargarOneclick = functions.https.onRequest(async (req, res) => {
    if (handleCors(req, res)) return;

    try {
        const { ordenId, cuotas } = req.body;

        if (!ordenId) {
            return res.status(400).json({ error: 'ordenId es requerido' });
        }

        const ordenRef = db.collection('ordenes').doc(ordenId);
        const ordenSnap = await ordenRef.get();

        if (!ordenSnap.exists) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }

        const orden = ordenSnap.data();
        
        if (!orden.oneclickInscripcion || orden.oneclickInscripcion.estado !== 'inscripcion_completada') {
            return res.status(400).json({ error: 'La tarjeta no está inscrita en Oneclick' });
        }

        const montoTotal = orden.montoTotal;
        if (!montoTotal || montoTotal <= 0) {
            return res.status(400).json({ error: 'Monto total inválido' });
        }

        const buyOrder = `GC-ONECLICK-${ordenId}-${Date.now()}`;
        const tbkUser = orden.oneclickInscripcion.tbk_user;
        const installmentsNumber = (cuotas && cuotas > 1) ? cuotas : null;

        console.log(`Realizando cargo Oneclick: buyOrder=${buyOrder}, monto=${montoTotal}, cuotas=${installmentsNumber || 1}`);

        const response = await WebpayOneClick.Transaction.authorize(
            COMMERCE_CODE,
            API_KEY,
            ENVIRONMENT,
            buyOrder,
            tbkUser,
            montoTotal,
            installmentsNumber
        );

        console.log('Respuesta de cargo Oneclick:', response);

        await db.collection('ordenes').doc(ordenId).update({
            oneclickCargo: {
                buyOrder,
                montoTotal,
                cuotas: installmentsNumber || 1,
                codigoAutorizacion: response.authorization_code,
                codigoTransaccion: response.transaction_date,
                estado: 'completado',
                fechaCargo: admin.firestore.FieldValue.serverTimestamp(),
                detalles: response
            },
            estado: 'pagado'
        });

        return res.json({
            success: true,
            message: 'Cargo realizado exitosamente',
            buyOrder: buyOrder,
            codigoAutorizacion: response.authorization_code
        });

    } catch (error) {
        console.error('Error en cargarOneclick:', error);
        return res.status(500).json({
            error: 'Error al realizar el cargo',
            details: error.message
        });
    }
});

exports.reversarOneclick = functions.https.onRequest(async (req, res) => {
    if (handleCors(req, res)) return;

    try {
        const { buyOrder } = req.body;

        if (!buyOrder) {
            return res.status(400).json({ error: 'buyOrder es requerido' });
        }

        console.log(`Reversando transacción Oneclick: buyOrder=${buyOrder}`);

        const response = await WebpayOneClick.Transaction.reverse(
            COMMERCE_CODE,
            API_KEY,
            ENVIRONMENT,
            buyOrder
        );

        console.log('Respuesta de reversa:', response);

        return res.json({
            success: true,
            message: 'Reversa realizada exitosamente',
            detalles: response
        });

    } catch (error) {
        console.error('Error en reversarOneclick:', error);
        return res.status(500).json({
            error: 'Error al reversar la transacción',
            details: error.message
        });
    }
});