const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Importar correctamente transbank-sdk v6.0.0
const { WebpayPlus, Environment } = require('transbank-sdk');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Credenciales Transbank (desde variables de entorno)
const COMMERCE_CODE = process.env.TRANSBANK_COMMERCE_CODE || "597055555532";
const API_KEY = process.env.TRANSBANK_API_KEY || "579B532A7440BB0C9079DED94D31EA1615BACEB7";
const ENVIRONMENT = Environment.Integration;

exports.crearTransaccionWebpay = functions.https.onRequest(async (req, res) => {
    // CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

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
        const montoTotal = orden.montoTotal;

        if (!montoTotal || montoTotal <= 0) {
            return res.status(400).json({ error: 'Monto total inválido' });
        }

        // Generar IDs únicos
        const buyOrder = `GC-${ordenId}-${Date.now()}`;
        const sessionId = `SESSION-${ordenId}-${Date.now()}`;
        const returnUrl = `${process.env.FIREBASE_PUBLIC_URL || 'https://gravecare.cl'}/confirmar-pago?session=${sessionId}`;

        // Procesar cuotas: pasar null si es 1 cuota, número si es más
        const installmentsNumber = (cuotas && cuotas > 1) ? cuotas : null;

        console.log(`Creando transacción Webpay: buyOrder=${buyOrder}, monto=${montoTotal}, cuotas=${installmentsNumber || 1}`);

        // Crear transacción en Webpay Plus usando API v6.0.0
        const response = await WebpayPlus.Transaction.create(
            COMMERCE_CODE,
            API_KEY,
            ENVIRONMENT,
            buyOrder,
            sessionId,
            montoTotal,
            returnUrl,
            installmentsNumber  // null o número
        );

        console.log('Respuesta de Transbank:', response);

        // Guardar transacción en Firestore
        await db.collection('ordenes').doc(ordenId).update({
            transaccionWebpay: {
                buyOrder,
                sessionId,
                montoTotal,
                cuotas: installmentsNumber || 1,
                estado: 'iniciada',
                fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
                tokenWpm: response.token
            }
        });

        return res.json({
            success: true,
            redirect_url: response.url,
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

exports.confirmarTransaccionWebpay = functions.https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Token no proporcionado' });
        }

        console.log('Confirmando transacción con token:', token);

        // Confirmar transacción en Transbank usando API v6.0.0
        const response = await WebpayPlus.Transaction.commit(
            COMMERCE_CODE,
            API_KEY,
            ENVIRONMENT,
            token
        );

        console.log('Respuesta de confirmación:', response);

        // Buscar orden por sessionId y actualizar
        const ordenes = await db.collection('ordenes').get();
        let ordenActualizada = false;

        for (const doc of ordenes.docs) {
            if (doc.data().transaccionWebpay?.sessionId === response.session_id) {
                await doc.ref.update({
                    transaccionWebpay: {
                        ...doc.data().transaccionWebpay,
                        estado: 'confirmada',
                        codigoAutorizacion: response.authorization_code,
                        codigoTransaccion: response.transaction_date,
                        detalles: response
                    },
                    estado: 'pagado'
                });
                ordenActualizada = true;
                break;
            }
        }

        if (!ordenActualizada) {
            console.warn('No se encontró orden para confirmar');
        }

        return res.json({
            success: true,
            message: 'Transacción confirmada correctamente'
        });

    } catch (error) {
        console.error('Error en confirmarTransaccionWebpay:', error);
        return res.status(500).json({
            error: 'Error al confirmar la transacción',
            details: error.message
        });
    }
});
