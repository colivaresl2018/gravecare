/**
 * CONTRATO — generación server-side del PDF del contrato de cada cliente
 */

const {onDocumentWritten} = require("firebase-functions/v2/firestore");
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

const CONTRATO_VERSION = "2026-09-v1";

function fechaLargaEs(fecha = new Date()) {
  return fecha.toLocaleDateString("es-CL", {
    day: "numeric", month: "long", year: "numeric", timeZone: "America/Santiago",
  });
}

function formatearCLP(numero) {
  return "$" + Number(numero || 0).toLocaleString("es-CL");
}

/** Arma el texto plano del contrato, resolviendo cualquier variación en la estructura de la orden */
function generarContratoTexto(orden, fecha = new Date()) {
  const titular = orden.titular || {};
  const difunto = orden.difunto || {};
  const ubicacion = orden.ubicacionSepultura || {};
  const servicio = orden.servicio || {};

  // 1. Nombre completo del Cliente / Titular garantizado
  let nombreTitular = titular.nombre || orden.nombreCliente || "";
  if (!nombreTitular && (titular.nombres || titular.apellidoPaterno)) {
    nombreTitular = [titular.nombres, titular.apellidoPaterno, titular.apellidoMaterno].filter(Boolean).join(" ");
  }
  if (!nombreTitular) nombreTitular = "[nombre no registrado]";

  // 2. Nombre del Ser Querido / Difunto garantizado
  let nombreDifunto = difunto.nombre || orden.nombreFallecido || "";
  if (!nombreDifunto && (difunto.nombres || difunto.apellidoPaterno)) {
    nombreDifunto = [difunto.nombres, difunto.apellidoPaterno, difunto.apellidoMaterno].filter(Boolean).join(" ");
  }
  if (!nombreDifunto) nombreDifunto = "[nombre no registrado]";

  // 3. Plan y descripción
  const esPlan = orden.tipoServicio === "PLAN" || orden.tipoSuscripcion === "PLAN";
  const nombrePlan = servicio.planNombre || orden.planNombre || (esPlan ? "Plan Mensual" : "Visita Spot");
  const frecuencia = servicio.frecuencia || orden.frecuencia || (esPlan ? "1 visita al mes" : "Visita única");
  const nivel = servicio.nivel || orden.nivel || "Standard";
  const descripcionPlan = `${nombrePlan} — ${frecuencia} — Nivel ${nivel}`;

  // 4. Dirección del Cliente
  const direccionCliente = [titular.direccion, titular.numero, titular.departamento ? `Depto ${titular.departamento}` : "", titular.comuna, titular.region]
    .filter(Boolean)
    .join(", ");

  // 5. Ubicación en cementerio
  const cementerioNombre = ubicacion.cementerio || orden.cementerio || "";
  const sector = ubicacion.sector || orden.sector || "";
  const patio = ubicacion.patio || orden.patio || "";
  const numeroSep = ubicacion.numeroSepultura || ubicacion.numero || orden.numeroSepultura || "";

  const ubicacionCementerio = [
    cementerioNombre,
    sector ? `Sector ${sector}` : "",
    patio ? `Patio ${patio}` : "",
    numeroSep ? `N° ${numeroSep}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  // 6. Monto total garantizado
  const totalNumerico = orden.montoTotal || orden.valores?.total || orden.precioNumerico || orden.precio || 34990;
  const monto = formatearCLP(totalNumerico);

  const plazo = esPlan
    ? `Suscripción con frecuencia "${frecuencia}", renovable automáticamente hasta que el Cliente la cancele o pause`
    : "Servicio único (Visita Spot), sin renovación automática";

  const hoy = fechaLargaEs(fecha);
  const rutCliente = titular.rut || orden.rut || orden.rutCliente || "[RUT no registrado]";
  const emailCliente = titular.email || orden.email || orden.emailCliente || "[email no registrado]";
  const fonoCliente = titular.telefono || orden.telefono || orden.telefonoCliente || "[teléfono no registrado]";

  return `TÉRMINOS Y CONDICIONES GENERALES Y MANDATO DE PRESTACIÓN DE SERVICIOS

GraveCare SpA — Servicios Conmemorativos & Preservación

En ${EMPRESA_CIUDAD}, a ${hoy}, entre GraveCare SpA, RUT N° ${EMPRESA_RUT}, con domicilio en ${EMPRESA_DIRECCION}, en adelante la «Empresa» o el «Prestador», por una parte; y por la otra, ${nombreTitular}, RUT N° ${rutCliente}, con domicilio en ${direccionCliente || "[dirección no registrada]"}, correo electrónico ${emailCliente} y teléfono ${fonoCliente}, en adelante el «Cliente», se ha convenido el siguiente contrato de prestación de servicios, el cual se regirá por las cláusulas siguientes:

PRIMERA: OBJETO DEL CONTRATO Y MANDATO ESPECIAL

1.1. Objeto: La Empresa se obliga a realizar para el Cliente los servicios de limpieza, ornamentación floral, mantención de nichos, mausoleos y sepulturas, de forma independiente y sin relación de subordinación ni dependencia, conforme al plan seleccionado en el sitio web gravecare.cl (${descripcionPlan}).

1.2. Otorgamiento de Mandato Especial de Servicio:

Facultad de Acceso y Representación: Al contratar el servicio, el Cliente declara bajo su responsabilidad ser titular de los derechos sobre la sepultura individualizada, o bien contar con la expresa autorización familiar y legal para contratar su cuidado.

Mandato Expreso: El Cliente confiere a GraveCare SpA y a su personal dependiente o contratado mandato especial y suficiente para ingresar al recinto del cementerio individualizado (${ubicacionCementerio || "[ubicación no registrada]"} — sepultura de ${nombreDifunto}), acceder a la sepultura, nicho o mausoleo y ejecutar exclusivamente las labores contratadas (limpieza manual, retiro de residuos vegetales, recambio de agua, postura de flores y registro audiovisual).

Exhibición de Mandato: La Empresa queda facultada para exhibir copia digital de la orden de trabajo ante la administración o guardias del cementerio si fuese requerida.

SEGUNDA: ALCANCE Y NATURALEZA DE LOS SERVICIOS

Labores Incluidas: Limpieza superficial y profunda no destructiva de placas, lápidas y cruces; retiro de flores secas anteriores; desmalezado perimetral manual; limpieza de jarrones/floreros; e instalación de arreglos florales frescos de estación según el plan contratado.

Exclusiones Explícitas: Salvo contratación de un servicio de restauración cotizado por separado, el servicio no incluye obras mayores de albañilería, traslados de restos, modificaciones estructurales, repintado total de mausoleos ni intervención de áreas comunes pertenecientes al parque cementerio.

Productos Utilizados: La Empresa se compromete a no emplear ácidos corrosivos ni químicos nocivos que dañen mármol, granito, bronce o el césped colindante.

TERCERA: EVIDENCIA Y REPORTE FOTOGRÁFICO

Cada intervención efectuada por la Empresa será respaldada mediante un reporte fotográfico y/o de video con tomas del estado inicial (Antes) y del estado terminado con las flores instaladas (Después). El reporte será remitido al Cliente dentro de las 24 horas hábiles siguientes a la ejecución de la visita, a través de WhatsApp o correo electrónico registrado. La entrega del reporte fotográfico constituye la prueba formal y definitiva de la ejecución conforme del servicio.

CUARTA: HONORARIOS Y FORMA DE PAGO

El Cliente pagará a la Empresa la suma de ${monto}, con IVA incluido, por concepto de honorarios por los servicios prestados. Los pagos se debitarán de manera periódica (según el plan de suscripción seleccionado) a través de pasarelas de pago automatizadas (Webpay Plus, Webpay One Click u otras habilitadas). Cualquier modificación en las tarifas de suscripción será notificada al Cliente con al menos 30 días corridos de anticipación.

QUINTA: PLAZO y VIGENCIA

5.1. Plazo: El presente contrato tendrá una duración de: ${plazo}, comenzando el día ${hoy}.

SEXTA: LIMITACIÓN DE RESPONSABILIDAD Y CASOS FORTUITOS

Acceso y Fuerza Mayor: La Empresa no será responsable por demoras o imposibilidad temporal de ejecutar la visita debidas a cierres imprevistos del cementerio, manifestaciones, duelo oficial del recinto, temporales climáticos o restricciones sanitarias. En tales casos, la visita será reprogramada dentro de los 7 días hábiles siguientes.

Daños Preexistentes: La Empresa no asume responsabilidad por fracturas, trizaduras, desgaste por intemperie u oxidación preexistente en mármoles, cerámicas o metales antiguos. Si el operario detecta un daño previo, tomará registro fotográfico inmediato antes de iniciar la limpieza.

Sustracción por Terceros: La Empresa no responde por hurtos o pérdidas de arreglos florales, placas o accesorios sustraídos por terceras personas ajenas a la Empresa con posterioridad a la entrega del servicio en el cementerio.

SÉPTIMA: PROTECCIÓN DE DATOS Y PRIVACIDAD

Los datos personales proporcionados por el Cliente (nombres, RUT, teléfonos, correos y ubicación de sepulturas) serán tratados de forma confidencial conforme a la Ley N° 19.628 sobre Protección de la Vida Privada y utilizados exclusivamente para la coordinación, ejecución del servicio, emisión de comprobantes tributarios y envío de reportes fotográficos.

OCTAVA: NATURALEZA DE LA RELACIÓN CONTRACTUAL Y CONFIDENCIALIDAD

Las partes declaran expresamente que entre ellas no existe relación laboral alguna, sino un vínculo civil de prestación de servicios y mandato. Asimismo, la Empresa guardará estricta reserva sobre cualquier información sensible a la que tenga acceso.

NOVENA: DOMICILIO Y JURISDICCIÓN

El presente contrato se rige íntegramente por las leyes de la República de Chile. Para todos los efectos legales derivados de este instrumento, las partes fijan su domicilio en la ciudad y comuna de Santiago de Chile, sometiéndose a la competencia de sus Tribunales Ordinarios de Justicia.

N° de Orden: ${orden.numeroOrden || orden.id || "[sin asignar]"}

EL CONTRATANTE (Cliente)
Nombre: ${nombreTitular}
RUT: ${rutCliente}
Aceptado electrónicamente el ${hoy} vía gravecare.cl

EL PRESTADOR (GraveCare SpA)
Nombre: GraveCare SpA
RUT: ${EMPRESA_RUT}`;
}

function fechaDelContrato(orden) {
  if (orden.terminosAceptadosEn) {
    const d = new Date(orden.terminosAceptadosEn);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const c = orden.createdAt || orden.creadoEl;
  if (c && typeof c.toDate === "function") return c.toDate();
  return new Date();
}

// En functions/contrato.js:

function generarPdfBuffer(texto) {
  const { jsPDF } = require("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  const margen = 54;
  const anchoUtil = doc.internal.pageSize.getWidth() - margen * 2;
  const altoPagina = doc.internal.pageSize.getHeight();
  const limiteInferior = altoPagina - 54;
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
  if (!orden || orden.estado !== "pagado") return false;
  if (orden.contratoPath) return false;
  if (orden.contratoEstado === "error") return false;
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
  if (!orden) return {omitido: true};

  try {
    const numero = String(orden.numeroOrden || ordenId).replace(/[^A-Za-z0-9_-]/g, "");
    const texto = generarContratoTexto(orden, fechaDelContrato(orden));
    const pdf = generarPdfBuffer(texto);

    const ruta = `contratos/${ordenId}/contrato.pdf`;
    const token = crypto.randomUUID();
    await admin.storage().bucket(BUCKET).file(ruta).save(pdf, {
      contentType: "application/pdf",
      resumable: false,
      metadata: {
        contentDisposition: `attachment; filename="Contrato-GraveCare-${numero}.pdf"`,
        metadata: {firebaseStorageDownloadTokens: token},
      },
    });

    const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(ruta)}?alt=media&token=${token}`;
    await ref.update({
      contratoPath: ruta,
      contratoUrl: url,
      contratoPdfVersion: CONTRATO_VERSION,
      contratoSha256: crypto.createHash("sha256").update(pdf).digest("hex"),
      contratoEstado: "listo",
      contratoGeneradoEn: admin.firestore.FieldValue.serverTimestamp(),
      contratoGenerandoDesde: admin.firestore.FieldValue.delete(),
    });

    console.log(`[generarContratoAlPagar] OK ${ordenId} (${pdf.length} bytes)`);
    return {omitido: false, ruta};
  } catch (err) {
    console.error(`[generarContratoAlPagar] Error en ${ordenId}:`, err);
    await ref.update({
      contratoEstado: "error",
      contratoError: String(err && err.message ? err.message : err).slice(0, 300),
      contratoGenerandoDesde: admin.firestore.FieldValue.delete(),
    });
    return {omitido: false, error: true};
  }
}

exports.generarContratoAlPagar = onDocumentWritten("ordenes/{ordenId}", async (event) => {
  const despues = event.data?.after?.data();
  if (!necesitaContrato(despues)) return;
  await generarContratoParaOrden(event.params.ordenId);
});

exports._generarContratoTexto = generarContratoTexto;
exports._generarPdfBuffer = generarPdfBuffer;
exports._necesitaContrato = necesitaContrato;
exports._generarContratoParaOrden = generarContratoParaOrden;
exports._CONTRATO_VERSION = CONTRATO_VERSION;