/**
 * generarContratoPDF.js
 * ============================================================================
 * Generador en PDF oficial de GraveCare Chile SpA (12 Cláusulas Legales).
 * Paginación dinámica y automática para evitar desbordes o cortes de texto.
 * ============================================================================
 */
import { jsPDF } from "jspdf";

export function generarContratoPDF(orden = {}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter", // 215.9 mm x 279.4 mm
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const contentWidth = pageWidth - marginX * 2;
  const marginBottom = 22;

  let posY = 20;

  // Variables y datos de la orden
  const numeroOrden = orden.numeroOrden || orden.id || "ORD-" + Date.now();
  const fechaDoc = orden.fechaTexto || new Date().toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  });

  const tipo = orden.Tipo || orden.tipo || "Plan";
  const tipoServicio = tipo === "Plan" ? "Plan de Suscripción de Cuidado" : "Servicio Spot de Mantenimiento";
  const planNombre = orden.servicio?.planNombre || orden.planNombre || (tipo === "Plan" ? "Plan Mensual" : "Servicio Spot");

  const titular = orden.titular || {};
  const nombreTitular = titular.nombre || `${titular.nombres || ''} ${titular.apellidoPaterno || ''} ${titular.apellidoMaterno || ''}`.trim() || orden.nombreTitular || "Christian Olivares Lizama";
  const rutTitular = titular.rut || titular.rutDni || "12.722.847-7";
  const direccionTitular = titular.direccionCompleta || `${titular.direccion || 'Evaristo Lillo'}, ${titular.numero || '111'}${titular.departamento ? ', ' + titular.departamento : ''}, ${titular.comuna || 'Las Condes'}, ${titular.region || 'Metropolitana'}`;
  const emailTitular = titular.email || "colivaresl@hotmail.com";
  const telefonoTitular = titular.telefono || "+56991788588";

  const difunto = orden.difunto || {};
  const nombreDifunto = difunto.nombre || `${difunto.nombres || ''} ${difunto.apellidoPaterno || ''}`.trim() || orden.nombreDifunto || "Ser Querido";

  const sepultura = orden.ubicacionSepultura || {};
  const cementerio = sepultura.cementerio || orden.cementerio || "Parque del Recuerdo";
  const sector = sepultura.sector || orden.sector || "General";
  const patio = sepultura.patio || orden.patio || "No especificado";
  const numSepultura = sepultura.numeroSepultura || sepultura.numero || "No especificado";

  const montoTotal = Number(orden.montoTotal || orden.valores?.total || orden.precioNumerico || 34990);
  const montoFormato = montoTotal.toLocaleString("es-CL", { style: "currency", currency: "CLP" });

  // Encabezado institucional
  function dibujarEncabezado() {
    doc.setFillColor(26, 54, 54);
    doc.rect(0, 0, pageWidth, 4, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(26, 54, 54);
    doc.text("GRAVECARE CHILE SpA", marginX, 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(90, 90, 90);
    doc.text("Preservación Ornamental & Cuidado de Sepulturas — RUT: 78.498.653-5", marginX, 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(193, 154, 91);
    doc.text("DOCUMENTO LEGAL VIGENTE", pageWidth - marginX, 14, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 90, 90);
    doc.text(`Orden: ${numeroOrden}`, pageWidth - marginX, 18, { align: "right" });

    doc.setDrawColor(210, 215, 210);
    doc.setLineWidth(0.4);
    doc.line(marginX, 21, pageWidth - marginX, 21);

    return 27;
  }

  // Verificación de desborde y salto de página
  function verificarEspacio(alturaNecesaria) {
    if (posY + alturaNecesaria > pageHeight - marginBottom) {
      doc.addPage();
      posY = dibujarEncabezado();
    }
  }

  function agregarParrafo(texto, interlineado = 4.2, espacioPosterior = 3) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(34, 34, 34);

    const lineas = doc.splitTextToSize(texto, contentWidth);
    const alturaParrafo = lineas.length * interlineado;

    verificarEspacio(alturaParrafo + espacioPosterior);
    doc.text(lineas, marginX, posY);
    posY += alturaParrafo + espacioPosterior;
  }

  function agregarClausula(titulo, texto) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(26, 54, 54);

    const lineasTitulo = doc.splitTextToSize(titulo, contentWidth);
    verificarEspacio(lineasTitulo.length * 4.2 + 2);
    doc.text(lineasTitulo, marginX, posY);
    posY += lineasTitulo.length * 4.2 + 1.5;

    agregarParrafo(texto, 4.2, 3.5);
  }

  // --- RENDERIZADO DEL CONTRATO ---
  posY = dibujarEncabezado();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(26, 54, 54);
  doc.text("CONTRATO DE PRESTACIÓN DE SERVICIOS & MANDATO ESPECIAL DE ACCESO", pageWidth / 2, posY, { align: "center" });
  posY += 6.5;

  // Comparecencia inicial
  agregarParrafo(
    `En Santiago de Chile, a ${fechaDoc}, entre GraveCare SpA, RUT N° 78.498.653-5, domiciliada en Av. El Carmen 1397, Huechuraba, Santiago, en adelante la «Empresa»; y por la otra parte, don(ña) ${nombreTitular}, RUT N° ${rutTitular}, domiciliado(a) en ${direccionTitular}, correo ${emailTitular} y teléfono ${telefonoTitular}, en adelante el «Cliente», se conviene lo siguiente:`
  );

  // CLÁUSULA 1
  agregarClausula(
    "1. IDENTIFICACIÓN DE LAS PARTES Y MANDATO ESPECIAL:",
    `Prestador: GraveCare Chile SpA (Email: info@gravecare.cl · Teléfono: +56 9 8256 6719). Cliente: don(ña) ${nombreTitular}, quien declara ser titular o estar facultado legalmente respecto de la sepultura ubicada en ${cementerio}, Sector: ${sector}, Patio: ${patio}, N° ${numSepultura}, correspondiente al lugar de descanso de don(ña) ${nombreDifunto}. El Cliente confiere a GraveCare SpA mandato especial suficiente para ingresar y ejecutar exclusivamente las labores pactadas.`
  );

  // CLÁUSULA 2
  agregarClausula(
    "2. DESCRIPCIÓN DEL SERVICIO Y MODALIDAD:",
    `Se acuerda la prestación de ${tipoServicio.toLowerCase()} bajo el nombre comercial ${planNombre}, según las coberturas escogidas. Monto pactado: ${montoFormato}. Estado del contrato: Confirmado con pago electrónico y firma digital vinculante.`
  );

  // CLÁUSULA 3
  agregarClausula(
    "3. ALCANCE DEL SERVICIO:",
    "Para suscripciones de plan: limpiezas periódicas no abrasivas, acondicionamiento de flores y ornamentos, desmalezado superficial, reporte fotográfico técnico tras cada visita y atención de mantenciones menores. Para servicios Spot: ejecución única programada, limpieza integral no estructural y reporte fotográfico comparativo antes y después de la intervención."
  );

  // CLÁUSULA 4
  agregarClausula(
    "4. RESPONSABILIDADES DEL CLIENTE:",
    "El Cliente se compromete a: (a) Abonar oportunamente los montos acordados; (b) Mantener actualizada su información de contacto; (c) Proporcionar los datos fidedignos de ubicación y titularidad en el cementerio; (d) Facilitar el acceso cuando el recinto requiera acreditación del deudo; (e) Revisar los reportes e informar observaciones dentro de 5 días hábiles."
  );

  // CLÁUSULA 5
  agregarClausula(
    "5. TÉRMINOS DE PAGO Y FACTURACIÓN:",
    `El monto total de ${montoFormato} es pagado mediante transacción electrónica certificada (Webpay Plus, Oneclick u otros medios autorizados). Para planes recurrentes, el cargo se efectúa en forma anticipada al inicio de cada ciclo de servicio.`
  );

  // CLÁUSULA 6
  agregarClausula(
    "6. VIGENCIA Y CANCELACIÓN:",
    "Los planes de suscripción cuentan con vigencia indefinida y renovación automática por períodos iguales, pudiendo el Cliente poner término al contrato en cualquier momento mediante aviso escrito con 30 días de anticipación. Los servicios Spot concluyen con la entrega formal del reporte fotográfico."
  );

  // CLÁUSULA 7
  agregarClausula(
    "7. LIMITACIONES Y EXIMENTES DE RESPONSABILIDAD:",
    "GraveCare SpA no responderá por deterioros atribuibles a fuerza mayor, sismos, inundaciones, robos o hurtos de elementos cometidos por terceros en el camposanto, restricciones sanitarias de la autoridad, ni restricciones normativas impuestas por la administración del cementerio."
  );

  // CLÁUSULA 8
  agregarClausula(
    "8. PROTECCIÓN DE DATOS PERSONALES (LEY N° 19.628):",
    "Los datos personales y de sepultura recopilados serán tratados bajo estrictos estándares de confidencialidad para la ejecución operativa, facturación y contacto. No serán cedidos ni comercializados a terceras entidades sin autorización previa."
  );

  // CLÁUSULA 9
  agregarClausula(
    "9. MODIFICACIONES Y ACTUALIZACIONES:",
    "La Empresa podrá perfeccionar sus metodologías y procesos operativos garantizando estándares de calidad iguales o superiores. Cualquier ajuste en tarifas periódicas será notificado al Cliente con un mínimo de 30 días de antelación, quien podrá rescindir el servicio si no acepta las modificaciones."
  );

  // CLÁUSULA 10
  agregarClausula(
    "10. RESOLUCIÓN DE CONTROVERSIAS Y JURISDICCIÓN:",
    "Las partes procurarán resolver amigablemente cualquier diferencia derivada de este instrumento. En caso de persistir el conflicto, se someten a la legislación chilena y prorrogan competencia ante los Tribunales Ordinarios de Justicia de la comuna de Santiago."
  );

  // CLÁUSULA 11
  agregarClausula(
    "11. ACEPTACIÓN DE TÉRMINOS Y VALIDEZ ELECTRÓNICA:",
    "Al confirmar la orden en la plataforma y completar el pago, el Cliente suscribe el presente documento mediante aceptación electrónica, otorgándole pleno valor probatorio y fuerza obligatoria según la Ley N° 19.799 sobre documentos electrónicos y firma digital."
  );

  // CLÁUSULA 12
  agregarClausula(
    "12. CONTACTO, SOPORTE Y CANALES OFICIALES:",
    "Canales de atención: Email contacto@gravecare.cl / info@gravecare.cl · WhatsApp +56 9 8256 6719 · Portal web www.gravecare.cl. Horario de atención: lunes a viernes de 09:00 a 18:00 hrs (hora de Chile continental)."
  );

  // Cuadro de Certificación y Firma Electrónica
  verificarEspacio(36);
  posY += 4;

  doc.setDrawColor(200, 205, 200);
  doc.setFillColor(248, 250, 248);
  doc.roundedRect(marginX, posY, contentWidth, 28, 2.5, 2.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(26, 54, 54);
  doc.text("CONSTANCIA DE FIRMA ELECTRÓNICA Y MANDATO APROBADO", marginX + 4, posY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);
  doc.text(`Titular Aceptante: ${nombreTitular} · RUT: ${rutTitular}`, marginX + 4, posY + 11);
  doc.text(`Identificador de Contrato: ${numeroOrden} · Protocolo Seguro GraveCare Chile SpA`, marginX + 4, posY + 16);
  doc.text(`Fecha y Certificación: ${fechaDoc} · Suscrito en línea vía www.gravecare.cl`, marginX + 4, posY + 21);

  // Pie de página y numeración correlativa en todas las hojas
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `GraveCare Chile SpA · Contrato y Mandato Especial ORD: ${numeroOrden} · Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  return doc;
}