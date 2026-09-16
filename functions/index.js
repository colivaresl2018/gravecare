/**
 * CLOUD FUNCTIONS - GraveCare (VERSIÓN CORREGIDA)
 * Inicializa sepulturas y datos de usuario al completar suscripción
 * 
 * Sintaxis actualizada para Firebase Functions v4.8.0
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Inicializar Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ============================================================================
// TRIGGER 1: Al crear documento en /pagos (nuevo pago/suscripción)
// ============================================================================
exports.onPagoCreated = functions.firestore
  .onDocumentCreated("pagos/{pagoId}", async (event) => {
    const pagoData = event.data.data();
    const pagoId = event.params.pagoId;
    
    console.log(`[onPagoCreated] Nuevo pago registrado: ${pagoId}`, pagoData);

    // Validar datos esenciales
    if (!pagoData.userId || !pagoData.plan) {
      console.warn(`[onPagoCreated] Datos incompletos en pago ${pagoId}`);
      return;
    }

    // Si el pago ya está completado al crearse
    if (pagoData.estado === "completado" || pagoData.estado === "approved") {
      await inicializarSepulturasPorPlan(
        pagoData.userId,
        pagoData.plan,
        pagoId
      );
    }
  });

// ============================================================================
// TRIGGER 2: Al actualizar estado de pago a "completado" (Webhooks)
// ============================================================================
exports.onPagoCompletado = functions.firestore
  .onDocumentUpdated("pagos/{pagoId}", async (event) => {
    const pagoAnterior = event.data.before.data();
    const pagoNuevo = event.data.after.data();
    const pagoId = event.params.pagoId;

    console.log(`[onPagoCompletado] Actualizando pago ${pagoId}`, {
      estadoAnterior: pagoAnterior.estado,
      estadoNuevo: pagoNuevo.estado
    });

    // Detectar transición a "completado"
    const esAhoraCompletado = 
      (pagoNuevo.estado === "completado" || pagoNuevo.estado === "approved") &&
      pagoAnterior.estado !== pagoNuevo.estado;

    if (esAhoraCompletado && pagoNuevo.userId && pagoNuevo.plan) {
      await inicializarSepulturasPorPlan(
        pagoNuevo.userId,
        pagoNuevo.plan,
        pagoId
      );
    }
  });

// ============================================================================
// FUNCIÓN PRINCIPAL: Inicializar sepulturas según plan
// ============================================================================
async function inicializarSepulturasPorPlan(userId, plan, pagoId) {
  try {
    console.log(`[inicializarSepulturasPorPlan] Iniciando para usuario ${userId}, plan: ${plan}`);

    // Definir sepulturas base según plan
    const sepulturasPorPlan = {
      basico: [
        {
          id: "sep-basico-1",
          nombre: "Mi Sepultura Familiar",
          tipo: "FAMILIAR",
          estado: "Activa",
          estadoClase: "bg-green-100 text-green-700",
          cementerio: "Seleccionar Cementerio",
          comuna: "Por definir",
          ubicacion: "Por definir",
          plan: "Plan Básico",
          proximaVisita: obtenerFechaProxima(30),
          esSpot: true,
          descripcion: "Plan básico con visitas bajo demanda",
          servicios: ["Limpieza", "Ornamentación"],
          frecuencia: "Bajo demanda",
          creadoEn: new Date().toISOString(),
          actualizadoEn: new Date().toISOString()
        }
      ],
      premium: [
        {
          id: "sep-premium-1",
          nombre: "Sepultura Principal",
          tipo: "FAMILIAR",
          estado: "Activa",
          estadoClase: "bg-green-100 text-green-700",
          cementerio: "Seleccionar Cementerio",
          comuna: "Por definir",
          ubicacion: "Por definir",
          plan: "Plan Premium",
          proximaVisita: obtenerFechaProxima(14),
          esSpot: false,
          descripcion: "Mantenimiento quincenal incluido",
          servicios: ["Limpieza", "Ornamentación", "Riego"],
          frecuencia: "Quincenal",
          creadoEn: new Date().toISOString(),
          actualizadoEn: new Date().toISOString()
        },
        {
          id: "sep-premium-2",
          nombre: "Sepultura Secundaria",
          tipo: "COLUMBARIO",
          estado: "Disponible para contratar",
          estadoClase: "bg-yellow-100 text-yellow-700",
          cementerio: "Seleccionar Cementerio",
          comuna: "Por definir",
          ubicacion: "Por definir",
          plan: "Plan Premium",
          proximaVisita: "2026-12-31",
          esSpot: true,
          descripcion: "Sepultura adicional para tu plan",
          servicios: [],
          frecuencia: "A contratar",
          creadoEn: new Date().toISOString(),
          actualizadoEn: new Date().toISOString()
        }
      ],
      vip: [
        {
          id: "sep-vip-1",
          nombre: "Sepultura Principal - VIP",
          tipo: "FAMILIAR",
          estado: "Activa",
          estadoClase: "bg-green-100 text-green-700",
          cementerio: "Seleccionar Cementerio",
          comuna: "Por definir",
          ubicacion: "Por definir",
          plan: "Plan VIP",
          proximaVisita: obtenerFechaProxima(7),
          esSpot: false,
          descripcion: "Mantenimiento semanal garantizado",
          servicios: ["Limpieza", "Ornamentación", "Riego", "Flores Frescas", "Reporte Fotográfico"],
          frecuencia: "Semanal",
          creadoEn: new Date().toISOString(),
          actualizadoEn: new Date().toISOString()
        },
        {
          id: "sep-vip-2",
          nombre: "Sepultura Secundaria - VIP",
          tipo: "FAMILIAR",
          estado: "Activa",
          estadoClase: "bg-green-100 text-green-700",
          cementerio: "Seleccionar Cementerio",
          comuna: "Por definir",
          ubicacion: "Por definir",
          plan: "Plan VIP",
          proximaVisita: obtenerFechaProxima(7),
          esSpot: false,
          descripcion: "Mantenimiento semanal garantizado",
          servicios: ["Limpieza", "Ornamentación", "Riego", "Flores Frescas"],
          frecuencia: "Semanal",
          creadoEn: new Date().toISOString(),
          actualizadoEn: new Date().toISOString()
        },
        {
          id: "sep-vip-3",
          nombre: "Columbario VIP",
          tipo: "COLUMBARIO",
          estado: "Activa",
          estadoClase: "bg-green-100 text-green-700",
          cementerio: "Seleccionar Cementerio",
          comuna: "Por definir",
          ubicacion: "Por definir",
          plan: "Plan VIP",
          proximaVisita: obtenerFechaProxima(7),
          esSpot: false,
          descripcion: "Servicio columbario con mantenimiento semanal",
          servicios: ["Limpieza", "Ornamentación", "Flores Frescas"],
          frecuencia: "Semanal",
          creadoEn: new Date().toISOString(),
          actualizadoEn: new Date().toISOString()
        },
        {
          id: "sep-vip-4",
          nombre: "Sitio Adicional VIP",
          tipo: "TERRENO",
          estado: "Disponible para contratar",
          estadoClase: "bg-yellow-100 text-yellow-700",
          cementerio: "Seleccionar Cementerio",
          comuna: "Por definir",
          ubicacion: "Por definir",
          plan: "Plan VIP",
          proximaVisita: "2026-12-31",
          esSpot: true,
          descripcion: "Terreno adicional para tu portafolio",
          servicios: [],
          frecuencia: "A contratar",
          creadoEn: new Date().toISOString(),
          actualizadoEn: new Date().toISOString()
        }
      ]
    };

    // Seleccionar sepulturas según plan
    const sepulturas = sepulturasPorPlan[plan.toLowerCase()] || sepulturasPorPlan.basico;

    // 1. Crear/Actualizar documento del usuario
    const userDocRef = db.collection("usuarios").doc(userId);
    await userDocRef.set({
      sepulturas: sepulturas,
      planActivo: plan,
      estadoPlan: "activo",
      fechaSuscripcion: admin.firestore.Timestamp.now(),
      fechaProximoRenovacion: calcularFechaRenovacion(plan),
      pagoInitiador: pagoId,
      estado: "activo",
      actualizadoEn: admin.firestore.Timestamp.now()
    }, { merge: true });

    // 2. Crear documento de auditoría/log
    await db.collection("auditoria").add({
      tipo: "suscripcion_inicializada",
      userId: userId,
      plan: plan,
      sepulturasCreadas: sepulturas.length,
      pagoId: pagoId,
      timestamp: admin.firestore.Timestamp.now(),
      detalles: {
        cantidadSepulturas: sepulturas.length,
        sepulturaIds: sepulturas.map(s => s.id)
      }
    });

    // 3. Crear documento de "onboarding"
    await db.collection("usuarios").doc(userId).collection("metadata").doc("onboarding").set({
      completado: false,
      paso: 1,
      pasos: [
        "Completar perfil",
        "Seleccionar cementerios",
        "Configurar ubicaciones exactas",
        "Revisar servicios",
        "Primera visita programada"
      ],
      iniciadoEn: admin.firestore.Timestamp.now()
    }, { merge: true });

    console.log(`✅ [inicializarSepulturasPorPlan] Éxito para usuario ${userId}`);
    return {
      success: true,
      userId,
      plan,
      sepulturasCreadas: sepulturas.length
    };

  } catch (error) {
    console.error(`❌ [inicializarSepulturasPorPlan] Error:`, error);
    
    // Guardar el error para debugging
    await db.collection("errores").add({
      tipo: "inicializacion_sepulturas",
      userId: userId,
      error: error.message,
      stack: error.stack,
      timestamp: admin.firestore.Timestamp.now()
    });

    throw error;
  }
}

// ============================================================================
// UTILIDADES
// ============================================================================

function obtenerFechaProxima(diasAdd) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + diasAdd);
  return fecha.toISOString().split('T')[0];
}

function calcularFechaRenovacion(plan) {
  const hoy = new Date();
  const meses = {
    basico: 1,
    premium: 1,
    vip: 1
  };
  
  const mesesAdd = meses[plan.toLowerCase()] || 1;
  hoy.setMonth(hoy.getMonth() + mesesAdd);
  
  return admin.firestore.Timestamp.fromDate(hoy);
}

// ============================================================================
// ENDPOINT HTTP (Opcional): Para testing manual
// ============================================================================
exports.testSuscripcion = functions.https.onCall(async (data, context) => {
  // Verificar autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Usuario no autenticado"
    );
  }

  const userId = context.auth.uid;
  const { plan } = data;

  if (!plan) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Plan no especificado"
    );
  }

  try {
    const resultado = await inicializarSepulturasPorPlan(userId, plan, "manual-test");
    return resultado;
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});
