// ====================================================
// FIREBASEPAYMENTS-MODIFICADO.js
// Módulo para guardar pagos en Firestore
// MODIFICADO: Guarda en: gastos_ingresos (COMPARTIDO CON CONTABILIDAD)
// ====================================================

import { db } from './firebaseConfig.js';
import { collection, doc, setDoc, serverTimestamp, addDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ====================================================
// VALIDACIÓN DE DATOS
// ====================================================
export function validatePaymentData(data) {
    const errors = [];
    
    if (!data.email || !data.email.includes('@')) {
        errors.push('Email inválido');
    }
    
    if (!data.rut || data.rut.length < 8) {
        errors.push('RUT inválido');
    }
    
    if (!data.cardNumber || data.cardNumber.replace(/\s/g, '').length < 13) {
        errors.push('Número de tarjeta inválido');
    }
    
    if (!data.cardCvv || data.cardCvv.length < 3) {
        errors.push('CVV inválido');
    }
    
    if (!data.cardExpiry || !data.cardExpiry.includes('/')) {
        errors.push('Vencimiento inválido');
    }
    
    if (!data.nombreTitular || data.nombreTitular.length < 3) {
        errors.push('Nombre del titular inválido');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

// ====================================================
// ENMASCARAR NÚMERO DE TARJETA
// ====================================================
export function maskCardNumber(cardNumber) {
    const cleaned = cardNumber.replace(/\s/g, '');
    return cleaned.slice(-4); // Retorna últimos 4 dígitos
}

// ====================================================
// GUARDAR PAGO EN FIRESTORE (COLECCIÓN: gastos_ingresos)
// MODIFICADO PARA SINCRONIZAR CON CONTABILIDAD
// ====================================================
export async function savePaymentToFirebase(orderData, paymentData, paymentResult) {
    try {
        console.log('💾 Iniciando guardado en Firebase (gastos_ingresos)...');
        console.log('📦 Datos de orden:', orderData);
        console.log('💳 Datos de pago:', paymentData);
        console.log('✅ Resultado de pago:', paymentResult);
        
        // Generar numeroOrden si no existe
        const numeroOrden = orderData.numeroOrden || 'ORD-' + Date.now();
        
        // Validar datos
        const validation = validatePaymentData(paymentData);
        if (!validation.valid) {
            throw new Error('Datos inválidos: ' + validation.errors.join(', '));
        }
        
        // Calcular IVA (19%)
        const montoNeto = orderData.precioNumerico || 0;
        const iva = montoNeto * 0.19;
        const total = montoNeto + iva;
        
        // Preparar documento para Firestore (FORMATO: gastos_ingresos)
        const paymentDocument = {
            // Campos de gastos_ingresos (ESTANDAR)
            fecha: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
            tipo: 'Ingreso', // Siempre Ingreso (es un pago recibido)
            empresa: paymentData.nombreTitular || 'Cliente GraveCare',
            rut: paymentData.rut,
            tipoDocumento: 'Factura', // O Boleta si es SPOT
            categoria: orderData.tipoSuscripcion === 'SUSCRIPCION' ? 'Suscripción' : 'Servicio Spot',
            montoNeto: montoNeto,
            iva: iva,
            total: total,
            estado: 'Pagado', // Siempre pagado si llegó aquí
            descripcion: orderData.tipoSuscripcion === 'SUSCRIPCION' 
                ? `Suscripción ${orderData.nivel} - ${orderData.frecuencia}` 
                : `Servicio Spot: ${orderData.tipo}`,
            
            // Metadatos originales (para referencia)
            numeroOrdenOriginal: numeroOrden,
            email: paymentData.email,
            nombreTitular: paymentData.nombreTitular,
            tarjetaUltimos4: maskCardNumber(paymentData.cardNumber),
            transactionId: paymentResult.transactionId || '',
            authCode: paymentResult.authCode || '',
            
            // Datos de la suscripción (si aplica)
            ...(orderData.tipoSuscripcion === 'SUSCRIPCION' && {
                frecuencia: orderData.frecuencia,
                nivel: orderData.nivel,
                precio: orderData.precio,
                precioBase: orderData.precioBase,
                adicional: orderData.adicional,
            }),
            
            // Datos del servicio Spot (si aplica)
            ...(orderData.tipoSuscripcion === 'SPOT' && {
                tipoServicio: orderData.tipo,
                fechaServicio: orderData.fechaServicio,
                fechaServicioLegible: orderData.fechaServicioLegible,
            }),
            
            // Metadatos
            fechaPago: serverTimestamp(),
            usuarioCreador: 'gravecare.cl',
            origen: 'Portal Público GraveCare',
            version: '2.0-contabilidad'
        };
        
        console.log('📄 Documento a guardar en gastos_ingresos:', paymentDocument);
        
        // ⭐ CAMBIO PRINCIPAL: Guardar en gastos_ingresos EN VEZ DE solicitudes_suscripcion
        const docRef = await addDoc(collection(db, 'gastos_ingresos'), paymentDocument);
        
        console.log('✅ Pago guardado en gastos_ingresos:', docRef.id);
        
        // BONUS: Mantener registro de índice en solicitudes_suscripcion para compatibilidad
        try {
            const indexDoc = {
                numeroOrden: numeroOrden,
                gastos_ingresosDocId: docRef.id,
                rut: paymentData.rut,
                email: paymentData.email,
                monto: montoNeto,
                estado: 'PROCESADO',
                fechaPago: serverTimestamp(),
                migradoA: 'gastos_ingresos'
            };
            await setDoc(doc(db, 'solicitudes_suscripcion', numeroOrden), indexDoc, { merge: true });
            console.log('📌 Índice guardado en solicitudes_suscripcion para compatibilidad');
        } catch (indexError) {
            console.warn('⚠️ No se pudo guardar índice (opcional):', indexError);
        }
        
        return {
            success: true,
            numeroOrden: numeroOrden,
            documentId: docRef.id,
            message: 'Pago procesado exitosamente y sincronizado con Contabilidad'
        };
        
    } catch (error) {
        console.error('❌ Error al guardar en Firebase:', error);
        throw error;
    }
}

// ====================================================
// OBTENER PAGOS POR RUT (DESDE gastos_ingresos)
// ====================================================
export async function getPaymentsByClient(rut) {
    try {
        // Ahora busca en gastos_ingresos en lugar de solicitudes_suscripcion
        const { query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        const q = query(collection(db, 'gastos_ingresos'), 
            where('rut', '==', rut),
            where('tipo', '==', 'Ingreso')
        );
        const querySnapshot = await getDocs(q);
        
        const payments = [];
        querySnapshot.forEach((doc) => {
            payments.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('✓ Pagos encontrados (gastos_ingresos):', payments);
        return payments;
        
    } catch (error) {
        console.error('❌ Error al obtener pagos:', error);
        return [];
    }
}

// ====================================================
// OBTENER PAGOS POR EMAIL (DESDE gastos_ingresos)
// ====================================================
export async function getPaymentsByEmail(email) {
    try {
        const { query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        const q = query(collection(db, 'gastos_ingresos'), 
            where('email', '==', email),
            where('tipo', '==', 'Ingreso')
        );
        const querySnapshot = await getDocs(q);
        
        const payments = [];
        querySnapshot.forEach((doc) => {
            payments.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('✓ Pagos por email (gastos_ingresos):', payments);
        return payments;
        
    } catch (error) {
        console.error('❌ Error al obtener pagos por email:', error);
        return [];
    }
}

// ====================================================
// ACTUALIZAR ESTADO DE PAGO (DESDE gastos_ingresos)
// ====================================================
export async function updatePaymentStatus(numeroOrden, updates) {
    try {
        // Buscar el documento en gastos_ingresos por numeroOrdenOriginal
        const { query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        const q = query(collection(db, 'gastos_ingresos'), where('numeroOrdenOriginal', '==', numeroOrden));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            throw new Error('Pago no encontrado: ' + numeroOrden);
        }
        
        const docId = querySnapshot.docs[0].id;
        const docRef = doc(db, 'gastos_ingresos', docId);
        await setDoc(docRef, updates, { merge: true });
        
        console.log('✓ Pago actualizado en gastos_ingresos:', numeroOrden);
        return { success: true };
        
    } catch (error) {
        console.error('❌ Error al actualizar pago:', error);
        throw error;
    }
}

console.log('✅ firebasePayments-MODIFICADO.js cargado correctamente (USANDO gastos_ingresos)');
