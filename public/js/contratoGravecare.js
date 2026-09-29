/**
 * contratoGravecare.js (navegador)
 *
 * Arma el texto del Contrato de Prestación de Servicios y Mandato de
 * GraveCare, relleno con los datos reales de la orden. Se muestra en
 * resumen-pago.html ANTES de pagar, para que el cliente lo lea y lo acepte.
 *
 * El PDF NO se genera aquí: lo genera el servidor (functions/contrato.js,
 * Cloud Function generarContratoAlPagar) cuando la orden pasa a "pagado",
 * con esta misma redacción. Así solo existe contrato de órdenes realmente
 * pagadas y no hace falta abrir Storage a escrituras de clientes anónimos.
 *
 * ⚠️ El texto vive en DOS archivos que deben ser idénticos:
 *    - este (lo que el cliente lee antes de pagar)
 *    - functions/contrato.js (lo que queda en el PDF)
 * Si cambias una cláusula, cámbiala en ambos y sube CONTRATO_VERSION.
 *
 * Datos legales de GraveCare SpA (RUT y dirección) tomados del E-RUT
 * emitido por el SII el 11/09/2026. Si la empresa cambia de domicilio,
 * actualiza EMPRESA_DIRECCION abajo.
 */

const EMPRESA_RUT = "78.498.653-5";
const EMPRESA_DIRECCION = "Av. El Carmen 1397, Of. 301, Edificio Portezuelo, Huechuraba";
const EMPRESA_CIUDAD = "Santiago";

/** Identifica qué redacción aceptó el cliente. Se guarda en la orden. */
export const CONTRATO_VERSION = "2026-09-v1";

// La fecha del contrato siempre en hora de Chile: el servidor corre en UTC
// y un pago hecho a las 22:00 en Santiago cambiaría de día.
function fechaLargaEs(fecha = new Date()) {
  return fecha.toLocaleDateString("es-CL", {
    day: "numeric", month: "long", year: "numeric", timeZone: "America/Santiago",
  });
}

function formatearCLP(numero) {
  return "$" + Number(numero || 0).toLocaleString("es-CL");
}

/** Arma el texto plano del contrato, reemplazando cada dato real de la orden. */
export function generarContratoTexto(orden, fecha = new Date()) {
  const titular = orden.titular || {};
  const difunto = orden.difunto || {};
  const ubicacion = orden.ubicacionSepultura || {};
  const servicio = orden.servicio || {};

  const esPlan = orden.tipoServicio === "PLAN" || orden.tipoSuscripcion === "PLAN";
  const nombrePlan = servicio.planNombre || orden.planNombre || (esPlan ? "Plan Mensual" : "Visita Spot");
  const frecuencia = servicio.frecuencia || orden.frecuencia || (esPlan ? "1 visita al mes" : "Visita única");
  const nivel = servicio.nivel || orden.nivel || "Standard";
  const descripcionPlan = `${nombrePlan} — ${frecuencia} — Nivel ${nivel}`;

  const direccionCliente = [titular.direccion, titular.numero, titular.departamento ? `Depto ${titular.departamento}` : "", titular.comuna, titular.region]
    .filter(Boolean)
    .join(", ");

  const ubicacionCementerio = [
    ubicacion.cementerio,
    ubicacion.sector ? `Sector ${ubicacion.sector}` : "",
    ubicacion.patio ? `Patio ${ubicacion.patio}` : "",
    ubicacion.numero ? `N° ${ubicacion.numero}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const monto = formatearCLP(orden.valores?.total || orden.precioNumerico);
  const plazo = esPlan
    ? `Suscripción con frecuencia "${frecuencia}", renovable automáticamente hasta que el Cliente la cancele o pause`
    : "Servicio único (Visita Spot), sin renovación automática";

  const hoy = fechaLargaEs(fecha);
  const nombreDifunto = difunto.nombre || "[nombre no registrado]";

  return `TÉRMINOS Y CONDICIONES GENERALES Y MANDATO DE PRESTACIÓN DE SERVICIOS

GraveCare SpA — Servicios Conmemorativos & Preservación

En ${EMPRESA_CIUDAD}, a ${hoy}, entre GraveCare SpA, RUT N° ${EMPRESA_RUT}, con domicilio en ${EMPRESA_DIRECCION}, en adelante la «Empresa» o el «Prestador», por una parte; y por la otra, ${titular.nombre || "[nombre no registrado]"}, RUT N° ${titular.rut || "[RUT no registrado]"}, con domicilio en ${direccionCliente || "[dirección no registrada]"}, correo electrónico ${titular.email || "[email no registrado]"} y teléfono ${titular.telefono || "[teléfono no registrado]"}, en adelante el «Cliente», se ha convenido el siguiente contrato de prestación de servicios, el cual se regirá por las cláusulas siguientes:

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

QUINTA: PLAZO Y VIGENCIA 

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

N° de Orden: ${orden.numeroOrden || "[sin asignar]"}

EL CONTRATANTE (Cliente)
Nombre: ${titular.nombre || "[nombre no registrado]"}
RUT: ${titular.rut || "[RUT no registrado]"}
Aceptado electrónicamente el ${hoy} vía gravecare.cl

EL PRESTADOR (GraveCare SpA)
Nombre: GraveCare SpA
RUT: ${EMPRESA_RUT}`;
}
