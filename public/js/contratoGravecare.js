/**
 * contratoGravecare.js
 * =====================
 * Generador de textos de contrato para GraveCare
 * Maneja formatos de fecha en timezone Chile (America/Santiago)
 */

export const CONTRATO_VERSION = "2.0";

/**
 * Formatea una fecha en español de Chile con timezone correcto
 * El servidor corre en UTC, pero el contrato debe mostrar hora de Santiago
 */
function fechaLargaES(fecha = new Date()) {
  return fecha.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  });
}

/**
 * Formatea una fecha corta (DD/MM/YYYY) en timezone Chile
 */
function fechaCorta(fecha = new Date()) {
  return fecha.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Santiago",
  });
}

/**
 * Genera el texto completo del contrato según el tipo de servicio
 * @param {Object} orden - Objeto con datos de la orden (tipo, cementerio, nombreDifunto, montoTotal, etc)
 * @param {Date} fecha - Fecha del contrato (opcional, por defecto la actual)
 * @returns {String} Texto HTML/plaintext del contrato
 */
export function generarContratoTexto(orden = {}, fecha = new Date()) {
  const fechaFormato = fechaLargaES(fecha);
  const fechaCorto = fechaCorta(fecha);
  
  const tipo = orden.Tipo || orden.tipo || "Plan";
  const cementerio = orden.cementerio || "No especificado";
  const nombreDifunto = orden.nombreDifunto || "No especificado";
  const nombreTitular = orden.nombreTitular || orden.titular || "No especificado";
  const montoTotal = orden.montoTotal || 0;
  const estado = orden.estado || "pendiente_pago";

  const montoFormato = montoTotal.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
  });

  const tipoServicio =
    tipo === "Plan"
      ? "Plan de Suscripción de Cuidado"
      : "Servicio Spot de Mantenimiento";

  return `
================================================================================
                        CONTRATO DE SERVICIOS GRAVECARE
================================================================================

Fecha del Contrato: ${fechaFormato}

================================================================================
1. IDENTIFICACIÓN DE LAS PARTES
================================================================================

PRESTADOR DE SERVICIOS:
  Nombre: GraveCare Chile
  Giro: Servicios de cuidado y mantenimiento de sepulturas
  Email: info@gravecare.cl
  Teléfono: +56 9 8256 6719

CLIENTE / TITULAR:
  Nombre: ${nombreTitular}
  Servicio Contratado: ${tipoServicio}

SEPULTURA / SITIO:
  Cementerio: ${cementerio}
  Difunto(a): ${nombreDifunto}

================================================================================
2. DESCRIPCIÓN DEL SERVICIO
================================================================================

Se acuerda la prestación de servicios de ${tipoServicio.toLowerCase()} para la
sepultura identificada anteriormente, según las características del plan
elegido por el cliente.

Tipo de Contrato: ${tipo === "Plan" ? "PLAN DE SUSCRIPCIÓN" : "SERVICIO SPOT"}
Monto Total: ${montoFormato}
Estado: ${estado === "pagado" ? "PAGADO" : "PENDIENTE DE PAGO"}

================================================================================
3. ALCANCE DEL SERVICIO
================================================================================

GraveCare se compromete a:

3.1 Para Planes de Suscripción:
    • Realizar limpiezas periódicas según la frecuencia del plan
    • Mantenimiento de flores y adornos
    • Reparación menor de danos en la sepultura
    • Reporte fotográfico mensual del estado
    • Atención de solicitudes de mantenimiento extraordinario

3.2 Para Servicios Spot:
    • Ejecución única del servicio solicitado
    • Reporte fotográfico antes y después
    • Corrección de anomalías detectadas en el sitio

================================================================================
4. RESPONSABILIDADES DEL CLIENTE
================================================================================

El cliente se compromete a:

4.1 Realizar el pago según lo acordado
4.2 Mantener actualizada su información de contacto
4.3 Comunicar cambios en la sepultura o disposiciones especiales
4.4 Proporcionar acceso al cementerio cuando sea necesario
4.5 Reportar problemas o inconformidades dentro de 5 días útiles

================================================================================
5. TÉRMINOS DE PAGO
================================================================================

Monto a Pagar: ${montoFormato}
Forma de Pago: Transacción electrónica (Webpay, Oneclick u otro método elegido)
Validez: A partir de la confirmación del pago

El pago debe ser realizado en el portal de GraveCare. Una vez confirmado,
se genera comprobante y comienza el servicio según lo pactado.

================================================================================
6. VIGENCIA Y CANCELACIÓN
================================================================================

6.1 VIGENCIA:
    • Planes: Se renuevan mensualmente/bimestralmente/trimestralmente
    • Servicios Spot: Vigencia única, según ejecución

6.2 CANCELACIÓN:
    • Planes: Puede cancelarse con 30 días de anticipación
    • No hay reembolsos parciales de períodos ya pagados
    • Se puede solicitar pausa temporal por hasta 3 meses

================================================================================
7. LIMITACIONES DE RESPONSABILIDAD
================================================================================

GraveCare NO es responsable por:

• Daños causados por vandalismo, robo o actos de terceros
• Fenómenos naturales (terremotos, inundaciones, etc.)
• Restricciones del cementerio sobre trabajos permitidos
• Cambios en regulaciones de cementerios durante la vigencia
• Fuerza mayor o casos fortuitos

El cliente retiene la responsabilidad legal sobre la sepultura.

================================================================================
8. PROTECCIÓN DE DATOS
================================================================================

Los datos personales proporcionados serán tratados conforme a la Ley N°19.628
sobre Protección de Datos Personales. Se utilizarán únicamente para:
• Prestación del servicio
• Facturación y contabilidad
• Contacto ante situaciones relevantes

No serán compartidos con terceros sin consentimiento previo.

================================================================================
9. MODIFICACIONES Y ACTUALIZACIONES
================================================================================

GraveCare se reserva el derecho de:
• Actualizar métodos de trabajo mantiendo el estándar de calidad
• Ajustar precios con 30 días de aviso previo
• Modificar este contrato con notificación 15 días antes

El cliente tiene derecho a cancelar si no acepta cambios significativos.

================================================================================
10. RESOLUCIÓN DE CONTROVERSIAS
================================================================================

En caso de conflicto:
1. Se intentará resolución directa entre las partes
2. Mediación a través de contacto comercial
3. Arbitraje según las normas de comercio de Chile

Legislación aplicable: Leyes de la República de Chile
Competencia: Juzgados de Santiago, si corresponde

================================================================================
11. ACEPTACIÓN DE TÉRMINOS
================================================================================

Al contratar con GraveCare y efectuar el pago, el cliente reconoce y acepta
ÍNTEGRAMENTE este contrato en todas sus partes, incluyendo términos y
condiciones generales.

Acepto que:
✓ He leído y entiendo todos los términos de este contrato
✓ Autorizo el pago y la prestación del servicio
✓ Confirmo que los datos proporcionados son correctos y actuales
✓ Acepto la política de privacidad y protección de datos

================================================================================
12. CONTACTO Y SOPORTE
================================================================================

Para consultas, reclamos o solicitudes:

Email: info@gravecare.cl
WhatsApp: +56 9 8256 6719
Sitio Web: www.gravecare.cl

Horario de Atención: Lunes a viernes, 09:00 - 18:00 hrs (Hora de Chile)

================================================================================
DOCUMENTO GENERADO ELECTRÓNICAMENTE
Versión de Contrato: ${CONTRATO_VERSION}
Fecha de Generación: ${fechaCorto}
ID Orden: ${orden.id || "NO ASIGNADO"}
================================================================================

Este contrato es válido y vinculante desde su firma electrónica mediante
la aceptación en el portal de GraveCare.

Gracias por confiar en GraveCare para el cuidado de sus seres queridos.

================================================================================
`;
}

/**
 * Función auxiliar: genera resumen corto del contrato (para preview)
 */
export function generarResumenContrato(orden = {}) {
  const tipo = orden.Tipo || orden.tipo || "Plan";
  const nombreDifunto = orden.nombreDifunto || "No especificado";
  const montoTotal = orden.montoTotal || 0;
  
  const montoFormato = montoTotal.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
  });

  return {
    tipo,
    nombreDifunto,
    monto: montoFormato,
    fecha: fechaLargaES(),
  };
}
