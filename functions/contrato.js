/**
 * CONTRATO — Generación server-side del PDF, registro en Firestore y aprovisionamiento
 */

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const crypto = require("crypto");

if (!admin.apps.length) {
  admin.initializeApp();
}

const BUCKET = "gravecare-2e8d2.firebasestorage.app";
const MINUTOS_EN_CURSO = 5;

// ===== Datos de Empresa =====
const EMPRESA_RUT = "78.498.653-5";
const EMPRESA_DIRECCION = "Av. El Carmen 1397, Of. 301, Edificio Portezuelo, Huechuraba";
const EMPRESA_CIUDAD = "Santiago";

function fechaLargaEs(fecha = new Date()) {
  return fecha.toLocaleDateString("es-CL", {
    day: "numeric", month: "long", year: "numeric", timeZone: "America/Santiago",
  });
}

function formatearCLP(numero) {
  return "$" + Number(numero || 0).toLocaleString("es-CL");
}

function limpiarRut(r) {
  return String(r || "").replace(/[^0-9kK]/g, "").toLowerCase();
}

function construirDetalleExactoServicio(orden) {
  const servicio = orden?.servicio || {};
  const nombrePlanRaw = String(servicio.planNombre || orden?.planNombre || orden?.plan || "").trim();

  let nombrePlan = "Plan 6";
  let frecuencia = "6 visitas anuales, 1 cada 2 meses";
  let visitasTotales = 6;
  let esSpot = false;

  const planLower = nombrePlanRaw.toLowerCase();
  if (planLower.includes("12")) {
    nombrePlan = "Plan 12";
    frecuencia = "12 visitas anuales (1 cada mes)";
    visitasTotales = 12;
  } else if (planLower.includes("4")) {
    nombrePlan = "Plan 4";
    frecuencia = "4 visitas anuales (1 cada 3 meses)";
    visitasTotales = 4;
  } else if (planLower.includes("spot") || planLower.includes("única") || planLower.includes("unica")) {
    nombrePlan = "Visita Spot";
    frecuencia = "Fecha única / Conmemorativa";
    visitasTotales = 1;
    esSpot = true;
  } else if (planLower.includes("6")) {
    nombrePlan = "Plan 6";
    frecuencia = "6 visitas anuales, 1 cada 2 meses";
    visitasTotales = 6;
  } else if (nombrePlanRaw) {
    nombrePlan = nombrePlanRaw;
    frecuencia = servicio.frecuencia || orden?.frecuencia || "Programación según plan";
  }

  const nivel = servicio.nivel || orden?.nivel || orden?.nivelServicio || "Standard";

  // Detección sanitizada de ramos por visita unitaria
  let ramosPorVisita = Number(
    orden?.ramosPorVisita || 
    servicio?.ramosPorVisita || 
    orden?.ramosAdicionalesPorVisita ||
    0
  );

  if (ramosPorVisita === 0) {
    let candidato = Number(orden?.ramosAdicionales || orden?.cantidadRamosAdicionales || servicio?.ramosAdicionales || orden?.ramosExtra || 0);
    if (candidato === visitasTotales && candidato > 2) {
      ramosPorVisita = 1;
    } else if (candidato > visitasTotales && candidato % visitasTotales === 0) {
      ramosPorVisita = candidato / visitasTotales;
    } else {
      ramosPorVisita = candidato;
    }
  }

  if (ramosPorVisita === 0 && Array.isArray(orden?.adicionales)) {
    const itemRamo = orden.adicionales.find(a => 
      typeof a === "object" && (a.id === "ramo_adicional" || String(a.nombre).toLowerCase().includes("ramo"))
    );
    if (itemRamo) ramosPorVisita = Number(itemRamo.cantidad || 1);
  }

  let textoRamos = "Sin ramos adicionales (incluye arreglo floral de temporada por visita)";
  if (ramosPorVisita > 0) {
    if (esSpot) {
      textoRamos = `${ramosPorVisita} ramo(s) adicional(es) para la visita`;
    } else {
      const totalAnual = ramosPorVisita * visitasTotales;
      textoRamos = `${ramosPorVisita} por visita (${totalAnual} al año en total)`;
    }
  }

  return {
    nombrePlan,
    frecuencia,
    nivel,
    ramosPorVisita,
    textoRamos,
    esSpot
  };
}

function generarContratoTexto(orden, fecha = new Date()) {
  const titular = orden?.titular || {};
  const difunto = orden?.difunto || {};
  const ubicacion = orden?.ubicacionSepultura || {};

  let nombreTitular = titular.nombreCompleto || titular.nombre || orden?.nombreCliente || "";
  if (!nombreTitular && (titular.nombres || titular.apellidoPaterno)) {
    nombreTitular = [titular.nombres, titular.apellidoPaterno, titular.apellidoMaterno].filter(Boolean).join(" ");
  }
  if (!nombreTitular) nombreTitular = "[nombre no registrado]";

  let nombreDifunto = difunto.nombre || orden?.nombreFallecido || orden?.nombreDifunto || "";
  if (!nombreDifunto && (difunto.nombres || difunto.apellidoPaterno)) {
    nombreDifunto = [difunto.nombres, difunto.apellidoPaterno, difunto.apellidoMaterno].filter(Boolean).join(" ");
  }
  if (!nombreDifunto) nombreDifunto = "Ser Querido";

  const det = construirDetalleExactoServicio(orden);

  const direccionCliente = [titular.direccion, titular.numero, titular.departamento ? `Depto ${titular.departamento}` : "", titular.comuna, titular.region]
    .filter(Boolean)
    .join(", ");

  const cementerioNombre = ubicacion.cementerio || orden?.cementerio || "Cementerio Registrado";
  const sector = ubicacion.sector || orden?.sector || "";
  const patio = ubicacion.patio || orden?.patio || "";
  const numeroSep = ubicacion.numeroSepultura || ubicacion.numero || orden?.numeroSepultura || "";

  let ubicacionPartes = [];
  if (sector) ubicacionPartes.push(`Sector: ${sector}`);
  if (patio) ubicacionPartes.push(`Patio: ${patio}`);
  if (numeroSep) ubicacionPartes.push(`N°: ${numeroSep}`);
  const ubicacionDetallada = ubicacionPartes.length > 0 ? ubicacionPartes.join(" | ") : "Ubicación por coordinar en terreno";

  const totalNumerico = orden?.montoTotal || orden?.valores?.total || orden?.precioNumerico || orden?.precio || 34990;
  const monto = formatearCLP(totalNumerico);
  const plazo = det.esSpot
    ? "Servicio único (Visita Spot), sin renovación automática"
    : `Suscripción con periodicidad "${det.frecuencia}", renovable automáticamente hasta que el Cliente la pause o cancele formalmente`;

  const hoy = fechaLargaEs(fecha);
  const rutCliente = titular.rut || orden?.rut || orden?.rutCliente || "[RUT no registrado]";
  const emailCliente = titular.email || orden?.email || orden?.emailCliente || "[email no registrado]";
  const fonoCliente = titular.telefono || orden?.telefono || orden?.telefonoCliente || "[teléfono no registrado]";

  return `TÉRMINOS Y CONDICIONES GENERALES Y MANDATO DE PRESTACIÓN DE SERVICIOS

GraveCare SpA — Servicios Conmemorativos & Preservación Ornamental

En ${EMPRESA_CIUDAD}, a ${hoy}, entre GraveCare SpA, RUT N° ${EMPRESA_RUT}, con domicilio en ${EMPRESA_DIRECCION}, en adelante la «Empresa» o el «Prestador», por una parte; y por la otra, don(ña) ${nombreTitular}, RUT N° ${rutCliente}, con domicilio en ${direccionCliente || "[dirección no registrada]"}, correo electrónico ${emailCliente} y teléfono ${fonoCliente}, en adelante el «Cliente», se ha convenido el siguiente contrato de prestación de servicios:

PRIMERO: OBJETO DEL SERVICIO Y MANDATO ESPECIAL
La Empresa se compromete a prestar las labores de aseo, mantención y preservación ornamental de sepulturas conforme a los términos contratados:
• Plan: ${det.nombrePlan}
• Frecuencia: ${det.frecuencia}
• Nivel de Servicio: ${det.nivel}
• Ramos Adicionales: ${det.textoRamos}

El Cliente declara bajo su exclusiva responsabilidad ser titular o contar con las facultades legales pertinentes sobre la sepultura individualizada (${cementerioNombre}, ${ubicacionDetallada}, sepultura de ${nombreDifunto}) y confiere a GraveCare SpA y a su personal operativo mandato especial y suficiente para ingresar al cementerio y ejecutar exclusivamente las labores contratadas.

SEGUNDO: ALCANCE Y EXCLUSIONES
Limpieza no destructiva de lápidas, cruces y accesorios ornamentales, retiro de flores secas, desmalezado y provisión de flores frescas acorde al nivel y adicionales acordados en la Cláusula Primera. Quedan expresamente excluidas intervenciones mayores de albañilería, restauración estructural profunda o movimiento de restos.

TERCERO: REPORTE Y VERIFICACIÓN DIGITAL
Cada visita en terreno generará un reporte fotográfico comparativo georreferenciado («Antes» y «Después»), remitido formalmente dentro de las 24 horas hábiles posteriores al correo electrónico del Cliente y publicado en su Portal de Cliente.

CUARTO: HONORARIOS Y FORMA DE PAGO
El valor convenido corresponde a la suma de ${monto} (IVA incluido), cancelado mediante pasarela electrónica autorizada.

QUINTO: PLAZO Y VIGENCIA
${plazo}, a contar de la confirmación electrónica de la orden.

SEXTO: LIMITACIÓN DE RESPONSABILIDAD
La Empresa responde por la correcta prestación del servicio conforme a los estándares acordados, no respondiendo por desgaste previo de materiales, actos vandálicos de terceros en el recinto ni restricciones imprevistas del cementerio.

SÉPTIMO: PROTECCIÓN DE DATOS
Tratamiento confidencial de antecedentes bajo la Ley N° 19.628 para fines exclusivos del servicio y facturación.

OCTAVO: NATURALEZA DEL VÍNCULO
Convenio de naturaleza estrictamente civil y comercial, sin que genere relación de dependencia ni subordinación laboral.

NOVENO: JURISDICCIÓN
Las partes se someten a la competencia de los Tribunales Ordinarios de Justicia de la ciudad de Santiago de Chile.

N° de Orden: ${orden?.numeroOrden || orden?.id || "[sin asignar]"}

EL CONTRATANTE (Cliente): ${nombreTitular} (RUT: ${rutCliente}) — Aceptado electrónicamente vía gravecare.cl
EL PRESTADOR: GraveCare SpA (RUT: ${EMPRESA_RUT})`;
}

function generarPdfBuffer(texto) {
  let jsPDF;
  try {
    const jspdfModule = require("jspdf");
    jsPDF = jspdfModule.jsPDF || jspdfModule;
  } catch (e) {
    return Buffer.from(texto, "utf-8");
  }

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margen = 54;
  const anchoUtil = doc.internal.pageSize.getWidth() - margen * 2;
  const limiteInferior = doc.internal.pageSize.getHeight() - 54;
  let y = margen;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  for (const parrafo of texto.split("\n")) {
    if (parrafo.trim() === "") {
      y += 8;
      continue;
    }
    const esTitulo = parrafo === parrafo.toUpperCase() && parrafo.length > 3 && parrafo.length < 90;
    doc.setFont("helvetica", esTitulo ? "bold" : "normal");
    doc.setFontSize(esTitulo ? 11 : 10);

    const lineas = doc.splitTextToSize(parrafo, anchoUtil);
    for (const linea of lineas) {
      if (y > limiteInferior) {
        doc.addPage();
        y = margen;
      }
      doc.text(linea, margen, y);
      y += esTitulo ? 15 : 13;
    }
    y += esTitulo ? 5 : 3;
  }

  return Buffer.from(doc.output("arraybuffer"));
}

function necesitaContrato(orden) {
  if (!orden) return false;
  const estado = String(orden.estado || orden.status || "").toLowerCase();
  const esPagado = ["pagado", "confirmado", "aprobado", "exito"].includes(estado);
  if (!esPagado) return false;
  if (orden.contratoPath && orden.contratoEstado === "listo") return false;
  if (orden.contratoEstado === "generando") {
    const desde = orden.contratoGenerandoDesde?.toMillis?.() || 0;
    if (Date.now() - desde < MINUTOS_EN_CURSO * 60 * 1000) return false;
  }
  return true;
}

async function generarContratoParaOrden(ordenId) {
  const db = admin.firestore();
  const ref = db.doc(`ordenes/${ordenId}`);

  const orden = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.data();
    if (!necesitaContrato(d)) return null;
    tx.update(ref, {
      contratoEstado: "generando",
      contratoGenerandoDesde: admin.firestore.FieldValue.serverTimestamp(),
    });
    return d;
  });

  if (!orden) return { omitido: true };

  try {
    const titular = orden.titular || {};
    const difunto = orden.difunto || {};
    const ubicacion = orden.ubicacionSepultura || {};

    const rutRaw = titular.rut || orden.rut || orden.rutCliente || "";
    const rutLimpio = limpiarRut(rutRaw);
    const emailTitular = String(titular.email || orden.email || orden.emailCliente || "").toLowerCase().trim();
    const uidCliente = rutLimpio ? `cliente_${rutLimpio}` : (orden.clienteUid || orden.usuarioId || `cliente_${ordenId}`);

    const numeroOrden = String(orden.numeroOrden || ordenId);
    const texto = generarContratoTexto(orden, new Date());
    const pdf = generarPdfBuffer(texto);

    const ruta = `contratos/${ordenId}/contrato.pdf`;
    const token = crypto.randomUUID();
    let url = "";

    try {
      await admin.storage().bucket(BUCKET).file(ruta).save(pdf, {
        contentType: "application/pdf",
        resumable: false,
        metadata: {
          contentDisposition: `attachment; filename="Contrato-GraveCare-${numeroOrden}.pdf"`,
          metadata: { firebaseStorageDownloadTokens: token },
        },
      });
      url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(ruta)}?alt=media&token=${token}`;
    } catch (errStorage) {
      console.warn(`[Storage Warning] Error al guardar PDF:`, errStorage.message);
    }

    const sha256 = crypto.createHash("sha256").update(pdf).digest("hex");

    if (rutLimpio || emailTitular) {
      await db.collection("usuarios").doc(uidCliente).set({
        uid: uidCliente,
        email: emailTitular,
        authEmail: rutLimpio ? `${rutLimpio}@gravecare.cl` : emailTitular,
        rut: rutRaw,
        rutLimpio: rutLimpio,
        nombreCompleto: titular.nombreCompleto || orden.nombreCliente || titular.nombre || "Cliente Registrado",
        telefono: titular.telefono || orden.telefono || "",
        direccion: titular.direccion || orden.direccion || "",
        comuna: titular.comuna || orden.comuna || "",
        rol: "cliente",
        estadoSuscripcion: "Activo",
        planNombre: orden.planNombre || "Plan GraveCare",
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      const normalizar = (txt) => String(txt || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      const cem = ubicacion.cementerio || orden.cementerio || "";
      const sec = ubicacion.sector || orden.sector || "";
      const pat = ubicacion.patio || orden.patio || "";
      const num = ubicacion.numeroSepultura || orden.numeroSepultura || "";

      const sepId = (cem && num)
        ? `sep_${normalizar(cem)}_${normalizar(sec)}_${normalizar(pat)}_${normalizar(num)}`
        : `sep_${numeroOrden}`;

      await db.collection("usuarios").doc(uidCliente).collection("sepulturas").doc(sepId).set({
        id: sepId,
        numeroOrden: numeroOrden,
        ultimaOrden: numeroOrden,
        nombreDifunto: difunto.nombre || orden.nombreDifunto || "Ser Querido",
        difunto: difunto,
        cementerio: cem || "Cementerio Registrado",
        sector: sec,
        patio: pat,
        numeroSepultura: num,
        estado: "Activa",
        planActivo: orden.planNombre || "Plan GraveCare",
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      if (rutLimpio) {
        await db.collection("rut_lookup").doc(rutLimpio).set({
          rut: rutLimpio,
          email: emailTitular,
          uid: uidCliente,
          actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }

    const idContrato = `CTR-${numeroOrden}`;
    await db.collection("contratos").doc(idContrato).set({
      id: idContrato,
      numeroOrden: numeroOrden,
      ordenId: ordenId,
      clienteUid: uidCliente,
      usuarioId: uidCliente,
      rut: rutRaw,
      email: emailTitular,
      planNombre: orden.planNombre || "Plan GraveCare",
      nombreDifunto: difunto.nombre || orden.nombreDifunto || "Ser Querido",
      cementerio: ubicacion.cementerio || orden.cementerio || "",
      estado: "vigente",
      urlContrato: url,
      sha256: sha256,
      fechaAprobacion: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await ref.update({
      clienteUid: uidCliente,
      usuarioId: uidCliente,
      contratoPath: ruta,
      contratoUrl: url,
      contratoSha256: sha256,
      contratoEstado: "listo",
      contratoGeneradoEn: admin.firestore.FieldValue.serverTimestamp(),
      contratoGenerandoDesde: admin.firestore.FieldValue.delete(),
    });

    return { omitido: false, ruta, contratoId: idContrato };
  } catch (err) {
    console.error(`[Error] en orden ${ordenId}:`, err);
    await ref.update({
      contratoEstado: "error",
      contratoError: String(err && err.message ? err.message : err).slice(0, 300),
      contratoGenerandoDesde: admin.firestore.FieldValue.delete(),
    });
    return { omitido: false, error: true };
  }
}

const generarContratoAlPagar = onDocumentWritten("ordenes/{ordenId}", async (event) => {
  const despues = event.data?.after?.data();
  if (!necesitaContrato(despues)) return;
  await generarContratoParaOrden(event.params.ordenId);
});

module.exports = {
  generarContratoAlPagar,
  generarContratoParaOrden
};