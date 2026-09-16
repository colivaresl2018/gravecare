/**
 * PAGOS.JS - Módulo de pagos y suscripciones
 * Ubicación: /js/pagos.js
 */
import { db } from "./firebase-config.js";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export async function getSubscriptionData(uid) {
  try {
    const userRef = doc(db, "usuarios", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return null;
    const data = userSnap.data();

    return {
      planNombre: data.planNombre || "Sin Plan Contratado",
      estadoSuscripcion: data.estadoSuscripcion || "Inactivo",
      precioMensual: data.precioMensual || 0,
      metodoPago: data.metodoPago || "Sin método registrado",
      ultimosDigitos: data.ultimosDigitos || "****",
      fechaSuscripcion: data.fechaSuscripcion ? new Date(data.fechaSuscripcion) : new Date(),
      descripcionPlan: data.descripcionPlan || "Cuidado y preservación de sepulturas"
    };
  } catch (error) {
    console.error("Error rescatando suscripción:", error);
    return null;
  }
}

export function calcularProximoCobro(fecha) {
  const f = new Date(fecha);
  f.setMonth(f.getMonth() + 1);
  return f;
}

export function formatearFecha(date) {
  if (!date) return "No disponible";
  return new Intl.DateTimeFormat('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date));
}

export async function getSepulturaVinculada(uid) {
  try {
    const sepulturasRef = collection(db, "usuarios", uid, "sepulturas");
    const snapshot = await getDocs(query(sepulturasRef, limit(1)));

    if (snapshot.empty) {
      return { cementerio: "No especificado", sector: "N/A" };
    }

    const s = snapshot.docs[0].data();
    return {
      cementerio: s.cementerio || s.cementerioNombre || "Cementerio registrado",
      sector: s.zona || s.sector || "General",
      id: snapshot.docs[0].id
    };
  } catch (error) {
    console.error("Error al traer sepultura vinculada:", error);
    return { cementerio: "No disponible", sector: "N/A" };
  }
}

export async function getHistorialPagos(uid, limite = 10) {
  try {
    const pagosRef = collection(db, "pagos");
    const q = query(
      pagosRef,
      where("usuarioId", "==", uid),
      orderBy("fecha", "desc"),
      limit(limite)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];

    return snapshot.docs.map(d => ({
      id: d.id,
      fecha: d.data().fecha ? (d.data().fecha.toDate ? d.data().fecha.toDate() : new Date(d.data().fecha)) : new Date(),
      concepto: d.data().concepto || "Servicio GraveCare",
      transactionId: d.data().transactionId || d.id.slice(0, 8).toUpperCase(),
      monto: d.data().monto || 0,
      estado: d.data().estado || "Pagado"
    }));
  } catch (error) {
    console.warn("Aviso historial de pagos (puede requerir índice compuesto):", error);
    return [];
  }
}

export function formatearMonto(monto) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(monto || 0);
}

export function getEstadoBadge(estado) {
  const e = (estado || "").toLowerCase();
  if (e === "pagado" || e === "completado") {
    return { bgColor: "bg-emerald-100", textColor: "text-emerald-800", icon: "check_circle", label: "Pagado" };
  }
  if (e === "pendiente") {
    return { bgColor: "bg-amber-100", textColor: "text-amber-800", icon: "schedule", label: "Pendiente" };
  }
  return { bgColor: "bg-red-100", textColor: "text-red-800", icon: "error", label: "Fallido" };
}