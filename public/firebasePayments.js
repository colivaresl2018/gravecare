// ====================================================
// FIREBASEPAYMENTS-OPCION-A.js
// Módulo para guardar pagos en Firestore
// Guarda en: solicitudes_suscripcion/{numeroOrden}
// ====================================================

import { db } from './firebaseConfig.js';
import { collection, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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
// GUARDAR PAGO EN FIRESTORE (OPCIÓN A)
// ====================================================
export async function savePaymentToFirebase(orderData, paymentData, paymentResult) {
    try {
        console.log('💾 Iniciando guardado en Firebase...');
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
        
        // Preparar documento para Firestore
        const paymentDocument = {
            // Datos básicos
            numeroOrden: numeroOrden,
            email: paymentData.email,
            rut: paymentData.rut,
            nombreTitular: paymentData.nombreTitular,
            
            // Datos de pago
            monto: orderData.precioNumerico || 0,
            moneda: 'CLP',
            estado: 'PROCESADO',
            
            // Datos de tarjeta (enmascarados)
            tarjetaUltimos4: maskCardNumber(paymentData.cardNumber),
            
            // Datos de la transacción
            transactionId: paymentResult.transactionId || '',
            authCode: paymentResult.authCode || '',
            
            // Tipo de suscripción
            tipoSuscripcion: orderData.tipoSuscripcion || 'SUSCRIPCION',
            
            // Si es SUSCRIPCIÓN
            ...(orderData.tipoSuscripcion === 'SUSCRIPCION' && {
                frecuencia: orderData.frecuencia,
                nivel: orderData.nivel,
                precio: orderData.precio,
                precioBase: orderData.precioBase,
                adicional: orderData.adicional,
                precioNumerico: orderData.precioNumerico
            }),
            
            // Si es SPOT
            ...(orderData.tipoSuscripcion === 'SPOT' && {
                tipo: orderData.tipo,
                fechaServicio: orderData.fechaServicio,
                fechaServicioLegible: orderData.fechaServicioLegible,
                precio: orderData.precio,
                precioNumerico: orderData.precioNumerico
            }),
            
            // Metadatos
            fechaPago: serverTimestamp(),
            version: '1.0'
        };
        
        console.log('📄 Documento a guardar:', paymentDocument);
        
        // Guardar en Firestore - Colección: solicitudes_suscripcion
        const docRef = doc(db, 'solicitudes_suscripcion', numeroOrden);
        await setDoc(docRef, paymentDocument, { merge: true });
        
        console.log('✅ Pago guardado en Firestore:', numeroOrden);
        
        return {
            success: true,
            numeroOrden: numeroOrden,
            message: 'Pago procesado exitosamente'
        };
        
    } catch (error) {
        console.error('❌ Error al guardar en Firebase:', error);
        throw error;
    }
}

// ====================================================
// OBTENER PAGOS POR RUT
// ====================================================
export async function getPaymentsByClient(rut) {
    try {
        const q = query(collection(db, 'solicitudes_suscripcion'), where('rut', '==', rut));
        const querySnapshot = await getDocs(q);
        
        const payments = [];
        querySnapshot.forEach((doc) => {
            payments.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('✓ Pagos encontrados:', payments);
        return payments;
        
    } catch (error) {
        console.error('❌ Error al obtener pagos:', error);
        return [];
    }
}

// ====================================================
// OBTENER PAGOS POR EMAIL
// ====================================================
export async function getPaymentsByEmail(email) {
    try {
        const q = query(collection(db, 'solicitudes_suscripcion'), where('email', '==', email));
        const querySnapshot = await getDocs(q);
        
        const payments = [];
        querySnapshot.forEach((doc) => {
            payments.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('✓ Pagos por email:', payments);
        return payments;
        
    } catch (error) {
        console.error('❌ Error al obtener pagos por email:', error);
        return [];
    }
}

// ====================================================
// ACTUALIZAR ESTADO DE PAGO
// ====================================================
export async function updatePaymentStatus(numeroOrden, updates) {
    try {
        const docRef = doc(db, 'solicitudes_suscripcion', numeroOrden);
        await setDoc(docRef, updates, { merge: true });
        
        console.log('✓ Pago actualizado:', numeroOrden);
        return { success: true };
        
    } catch (error) {
        console.error('❌ Error al actualizar pago:', error);
        throw error;
    }
}

console.log('✅ firebasePayments-OPCION-A.js cargado correctamente');
