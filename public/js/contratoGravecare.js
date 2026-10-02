/**
 * generarContratoPDF.js
 * ============================================================================
 * Generador formal en PDF para contratos y mandatos de GraveCare Chile SpA.
 * Implementa auto-paginación dinámica para evitar que el texto se corte.
 * ============================================================================
 */
import { jsPDF } from "jspdf";

export function generarContratoPDF(orden = {}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter", // 215.9 mm x 279.4 mm
  });

  // Dimensiones y márgenes
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 20;
  const contentWidth = pageWidth - marginX * 2;
  const marginBottom = 25;

  let posY = 20;

  // Extraer variables de la orden
  const numeroOrden = orden.numeroOrden || orden.id || "ORD-" + Date.now();
  const fechaDoc = orden.fechaTexto || new Date().toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  });

  const titular = orden.titular || {};
  const nombreTitular = titular.nombre || `${titular.nombres || ''} ${titular.apellidoPaterno || ''}`.trim() || "Christian Olivares Lizama";
  const rutTitular = titular.rut || titular.rutDni || "12.722.847-7";
  const direccionTitular = titular.direccionCompleta || `${titular.direccion || 'Evaristo Lillo'}, ${titular.numero || '111'}${titular.departamento ? ', ' + titular.departamento : ''}, ${titular.comuna || 'Las Condes'}, ${titular.region || 'Metropolitana'}`;
  const emailTitular = titular.email || "contacto@cliente.cl";
  const telefonoTitular = titular.telefono || "+56912345678";

  const difunto = orden.difunto || {};
  const nombreDifunto = difunto.nombre || `${difunto.nombres || ''} ${difunto.apellidoPaterno || ''}`.trim() || orden.nombreDifunto || "Ser Querido";

  const sepultura = orden.ubicacionSepultura || {};
  const cementerio = sepultura.cementerio || orden.cementerio || "Parque del Recuerdo";
  const patio = sepultura.patio || "No especificado";
  const numSepultura = sepultura.numeroSepultura || sepultura.numero || "No especificado";
  const planNombre = orden.servicio?.planNombre || orden.planNombre || "Plan de Cuidado";

  // Función para dibujar el encabezado formal de GraveCare
  function dibujarEncabezado() {
    doc.setFillColor(26, 54, 54); // #1a3636
    doc.rect(0, 0, pageWidth, 5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(26, 54, 54);
    doc.text("GRAVECARE CHILE SpA", marginX, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Preservación Ornamental & Cuidado de Sepulturas — RUT: 78.498.653-5", marginX, 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(193, 154, 91); // Acento dorado
    doc.text("DOCUMENTO LEGAL VIGENTE", pageWidth - marginX, 16, { align: "right" });
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Orden: ${numeroOrden}`, pageWidth - marginX, 20, { align: "right" });

    doc.setDrawColor(220, 223, 220);
    doc.setLineWidth(0.5);
    doc.line(marginX, 23, pageWidth - marginX, 23);

    return 30; // Posición Y donde comienza el texto tras el header
  }

  // Comprueba si el texto cabe en la página; si no, añade nueva hoja con encabezado
  function verificarEspacio(alturaNecesaria) {
    if (posY + alturaNecesaria > pageHeight - marginBottom) {
      doc.addPage();
      posY = dibujarEncabezado();
    }
  }

  function agregarParrafo(texto, interlineado = 5, espacioPosterior = 4) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(34, 34, 34);

    const lineas = doc.splitTextToSize(texto, contentWidth);
    const alturaParrafo = lineas.length * interlineado;

    verificarEspacio(alturaParrafo + espacioPosterior);
    doc.text(lineas, marginX, posY);
    posY += alturaParrafo + espacioPosterior;
  }

  function agregarClausula(titulo, texto) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(26, 54, 54);

    const lineasTitulo = doc.splitTextToSize(titulo, contentWidth);
    verificarEspacio(lineasTitulo.length * 5 + 3);
    doc.text(lineasTitulo, marginX, posY);
    posY += lineasTitulo.length * 5 + 2;

    agregarParrafo(texto, 4.8, 5);
  }

  // --- COMIENZO DEL RENDERIZADO DEL CONTRATO ---
  posY = dibujarEncabezado();

  // Título Principal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(26, 54, 54);
  doc.text("CONTRATO DE PRESTACIÓN DE SERVICIOS & MANDATO ESPECIAL DE ACCESO", pageWidth / 2, posY, { align: "center" });
  posY += 8;

  // Comparecencia inicial
  agregarParrafo(
    `En Santiago de Chile, a ${fechaDoc}, entre GraveCare SpA, RUT N° 78.498.653-5, domiciliada en Av. El Carmen 1397, Huechuraba, Santiago, en adelante la «Empresa»; y por la otra parte, don(ña) ${nombreTitular}, RUT N° ${rutTitular}, domiciliado(a) en ${direccionTitular}, correo electrónico ${emailTitular} y teléfono ${telefonoTitular}, en adelante el «Cliente», se ha convenido el siguiente contrato y mandato:`
  );

  // Cláusulas completas sin cortes
  agregarClausula(
    "PRIMERO (Objeto y Mandato Especial):",
    `La Empresa prestará los servicios integrales de mantención, preservación técnica y cuidado ornamental conforme al ${planNombre}. El Cliente declara bajo juramento ser titular, familiar directo o representante debidamente facultado de la sepultura ubicada en ${cementerio} (Patio: ${patio}, N°: ${numSepultura}), correspondiente al lugar de descanso de don(ña) ${nombreDifunto}. Por medio de este instrumento, confiere mandato especial a GraveCare SpA para concurrir al parque cementerio y ejecutar las tareas contratadas.`
  );

  agregarClausula(
    "SEGUNDO (Alcance del Servicio y Exclusiones):",
    "Las labores comprenden retiro cuidadoso de flores secas, remoción mecánica no abrasiva de suciedad y polvo, lavado neutro de lápidas, cruces y jardineras, desmalezado y poda perimetral del césped o manto verde, y aplicación de preservantes autorizados. Quedan expresamente excluidas intervenciones estructurales mayores, movimientos de losas pesadas, exhumaciones o modificaciones a la arquitectura funeraria protegida."
  );

  agregarClausula(
    "TERCERO (Certificación y Reporte Digital):",
    "La Empresa registrará fotográficamente el sitio antes y después de cada visita programada. Dicho material será publicado en la plataforma web privada del Cliente y notificado por correo electrónico dentro de las 48 horas hábiles siguientes a la finalización de los trabajos en terreno."
  );

  agregarClausula(
    "CUARTO (Precio, Formas de Pago y Renovación):",
    "Los servicios se pactan por la tarifa correspondiente al plan elegido por el Cliente y cancelada electrónicamente a través de los portales autorizados de la Empresa (Webpay Plus / Oneclick). En planes de suscripción periódica, el cobro se renovará automáticamente al término de cada ciclo, salvo notificación previa del Cliente."
  );

  agregarClausula(
    "QUINTO (Eximentes de Responsabilidad):",
    "La Empresa velará por el resguardo ornamental, pero no responderá por deterioros derivados de fenómenos telúricos, aluviones, robo o sustracción de placas de bronce o adornos cometidos por terceros al interior del recinto, ni por restricciones sanitarias o administrativas emanadas por la administración del cementerio o autoridades públicas."
  );

  agregarClausula(
    "SEXTO (Vigencia, Terminación y Jurisdicción):",
    "El presente contrato rige a contar del pago efectivo del servicio. El Cliente podrá dar término a las suscripciones mensuales mediante aviso con 30 días de anticipación por correo electrónico. Para todos los efectos legales, las partes fijan domicilio en la ciudad de Santiago y se someten a la competencia de sus Tribunales Ordinarios de Justicia."
  );

  // Cuadro de Firmas y Validación Electrónica
  verificarEspacio(42);
  posY += 6;

  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 248);
  doc.roundedRect(marginX, posY, contentWidth, 32, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(26, 54, 54);
  doc.text("CONSTANCIA DE FIRMA Y ACEPTACIÓN ELECTRÓNICA", marginX + 5, posY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(`Aceptado íntegramente por: ${nombreTitular} (RUT ${rutTitular})`, marginX + 5, posY + 13);
  doc.text(`Identificador de Operación: ${numeroOrden} · Protocolo Seguro GraveCare Chile SpA`, marginX + 5, posY + 18);
  doc.text(`Fecha y hora de suscripción: ${fechaDoc} · Plataforma Oficial www.gravecare.cl`, marginX + 5, posY + 23);

  // Pie de página y numeración en todas las hojas creadas
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `GraveCare Chile SpA · Documento Legal ORD: ${numeroOrden} · Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  return doc;
}