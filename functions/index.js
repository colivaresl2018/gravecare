/**
 * CLOUD FUNCTIONS - GraveCare
 */

const functions = require("firebase-functions");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ============================================================================
// TRIGGER FIRESTORE (v2): Enviar correo al cliente tras pago exitoso
// ============================================================================
exports.onOrdenPagadaEnviarMail = onDocumentWritten("ordenes/{ordenId}", async (event) => {
  const change = event.data;
  if (!change || !change.after.exists) return null;

  const antes = change.before.exists ? change.before.data() : null;
  const despues = change.after.data();
  const ordenId = event.params.ordenId;

  // Obtener estado actual y previo
  const estadoAntes = (antes?.estado || antes?.status || "").toLowerCase();
  const estadoDespues = (despues?.estado || despues?.status || "").toLowerCase();

  const esPagadoAhora = ["pagado", "aprobado", "exito"].includes(estadoDespues);
  const eraPagadoAntes = ["pagado", "aprobado", "exito"].includes(estadoAntes);

  // Evita reenvíos si no cambió a pagado o si ya se despachó el mail
  if (!esPagadoAhora || eraPagadoAntes || despues.mailConfirmacionEnviado === true) {
    return null;
  }

  const emailCliente = (
    despues.titular?.email ||
    despues.email ||
    despues.emailCliente ||
    ""
  ).toLowerCase().trim();

  if (!emailCliente || !emailCliente.includes("@")) {
    console.warn(`[Mail] La orden ${ordenId} no tiene un correo válido asignado.`);
    return null;
  }

  const nombreTitular =
    despues.titular?.nombre ||
    despues.titular?.nombres ||
    despues.nombreTitular ||
    "Estimado(a) Cliente";

  const numeroOrden = despues.numeroOrden || ordenId;
  const planNombre =
    despues.servicio?.planNombre ||
    despues.planNombre ||
    (despues.tipo === "SPOT" ? "Servicio Spot" : "Plan de Cuidado GraveCare");

  const difunto =
    despues.difunto?.nombre ||
    `${despues.difunto?.nombres || ""} ${despues.difunto?.apellidoPaterno || ""}`.trim() ||
    despues.nombreDifunto ||
    "Ser Querido";

  const cementerio =
    despues.ubicacionSepultura?.cementerio ||
    despues.cementerio ||
    "Cementerio Registrado";

  const sector = despues.ubicacionSepultura?.sector || despues.sector || "";
  const patio = despues.ubicacionSepultura?.patio || despues.patio || "";
  const sepultura = despues.ubicacionSepultura?.numeroSepultura || despues.numeroSepultura || "";

  let detalleUbicacion = cementerio;
  const detallesArr = [];
  if (sector) detallesArr.push(`Sector: ${sector}`);
  if (patio) detallesArr.push(`Patio: ${patio}`);
  if (sepultura) detallesArr.push(`N°: ${sepultura}`);
  if (detallesArr.length > 0) {
    detalleUbicacion += ` (${detallesArr.join(" | ")})`;
  }

  const totalMonto = Number(
    despues.valores?.total ||
    despues.montoTotal ||
    despues.precioNumerico ||
    0
  ).toLocaleString("es-CL");

  const htmlEmail = `
    <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
      
      <!-- Encabezado corporativo -->
      <div style="background-color: #1a3636; padding: 30px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">GraveCare Chile</h1>
        <p style="color: #c19a5b; margin: 6px 0 0 0; font-size: 13px; font-weight: 600; text-transform: uppercase;">Confirmación de Contratación Exitosa</p>
      </div>

      <!-- Contenido principal -->
      <div style="padding: 32px 24px; color: #2d3748;">
        <h2 style="color: #1a3636; font-size: 18px; margin-top: 0;">¡Hola, ${nombreTitular}!</h2>
        <p style="font-size: 14.5px; line-height: 1.6; color: #4a5568;">
          Te confirmamos que el pago de tu servicio ha sido aprobado y tu orden fue registrada con éxito en nuestra plataforma.
        </p>

        <!-- Tarjeta de Resumen -->
        <div style="background-color: #f7f9f8; border: 1px solid #e2e8f0; border-left: 4px solid #1a3636; border-radius: 8px; padding: 18px; margin: 24px 0;">
          <p style="margin: 0 0 8px 0; font-size: 13.5px;"><strong>Nº de Orden:</strong> <span style="color: #1a3636; font-weight: 700;">${numeroOrden}</span></p>
          <p style="margin: 0 0 8px 0; font-size: 13.5px;"><strong>Servicio:</strong> ${planNombre}</p>
          <p style="margin: 0 0 8px 0; font-size: 13.5px;"><strong>Ser Querido:</strong> ${difunto}</p>
          <p style="margin: 0 0 8px 0; font-size: 13.5px;"><strong>Ubicación:</strong> ${detalleUbicacion}</p>
          <p style="margin: 0; font-size: 13.5px;"><strong>Monto Total:</strong> $${totalMonto} CLP (IVA incluido)</p>
        </div>

        <h3 style="color: #1a3636; font-size: 15.5px; margin-bottom: 8px;">Próximos Pasos Operativos:</h3>
        <ol style="font-size: 13.5px; line-height: 1.6; color: #4a5568; padding-left: 20px; margin: 0 0 24px 0;">
          <li style="margin-bottom: 6px;">Coordinaremos con la administración del cementerio para el acceso en terreno.</li>
          <li style="margin-bottom: 6px;">Ejecutaremos la mantención y cuidado conforme al protocolo de tu servicio.</li>
          <li>Podrás consultar las fotografías del antes y después directamente desde tu perfil web.</li>
        </ol>

        <!-- Botón de acceso -->
        <div style="text-align: center; margin: 30px 0 15px 0;">
          <a href="https://gravecare.cl/login.html?email=${encodeURIComponent(emailCliente)}" 
             style="background-color: #1a3636; color: #ffffff; padding: 13px 30px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
             Ingresar a Mi Perfil
          </a>
        </div>
      </div>

      <!-- Pie de página -->
      <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #718096;">
        <p style="margin: 0 0 4px 0;">GraveCare Chile SpA · Preservación Ornamental & Cuidado de Sepulturas</p>
        <p style="margin: 0;">Contacto: contacto@gravecare.cl · WhatsApp: +56 9 9828 0501 · www.gravecare.cl</p>
      </div>

    </div>
  `;

  // Instanciación del transporte SMTP dentro de la ejecución diferida
  const transporter = nodemailer.createTransport({
    host: "octopus.hplus.cl",
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: "contacto@gravecare.cl",
      pass: "Gravecare2026",
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });

  const mailOptions = {
    from: '"GraveCare Chile" <contacto@gravecare.cl>',
    to: emailCliente,
    bcc: "contacto@gravecare.cl",
    subject: `✓ Contratación Confirmada: ${planNombre} (Orden ${numeroOrden})`,
    html: htmlEmail,
    headers: {
      "X-Priority": "3",
      "X-MSMail-Priority": "Normal",
      "Importance": "Normal",
    },
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Mail] Correo enviado exitosamente a ${emailCliente} para orden ${numeroOrden}`);

    // Marcamos en la orden que el mail ya fue enviado para evitar duplicados
    await change.after.ref.update({
      mailConfirmacionEnviado: true,
      mailConfirmacionFecha: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`[Mail Error] Fallo al enviar confirmación para orden ${numeroOrden}:`, error);
  }

  return null;
});

// ============================================================================
// ENDPOINT HTTP: prueba manual de sincronización de sepultura para una orden
// ============================================================================
exports.testSincronizarSepultura = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Usuario no autenticado");
  }

  const { ordenId } = data;
  if (!ordenId) {
    throw new functions.https.HttpsError("invalid-argument", "Falta ordenId");
  }

  const ordenSnap = await db.collection("ordenes").doc(ordenId).get();
  if (!ordenSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Orden no encontrada");
  }

  const sepulturasMod = require("./sepulturas");
  try {
    return await sepulturasMod.sincronizarSepulturaDesdeOrden(ordenId, ordenSnap.data());
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// Triggers de sepulturas
const sepulturas = require("./sepulturas");
exports.onOrdenEscrita = sepulturas.onOrdenEscrita;

// Transbank Webpay Plus
const transbank = require("./transbank");
exports.crearTransaccionWebpay = transbank.crearTransaccionWebpay;
exports.confirmarTransaccionWebpay = transbank.confirmarTransaccionWebpay;

// Transbank Webpay Oneclick
const oneclick = require("./oneclick");
exports.iniciarInscripcionOneclick = oneclick.iniciarInscripcionOneclick;
exports.confirmarInscripcionOneclick = oneclick.confirmarInscripcionOneclick;
exports.cargarOneclick = oneclick.cargarOneclick;
exports.reversarOneclick = oneclick.reversarOneclick;

// Contacto
const contacto = require("./contacto");
exports.enviarContacto = contacto.enviarContacto;

// Contratos
const contrato = require("./contrato");
exports.generarContratoAlPagar = contrato.generarContratoAlPagar;

// Permisos Staff
const staffClaims = require("./staffClaims");
exports.onStaffEscrito = staffClaims.onStaffEscrito;
exports.sincronizarStaffExistente = staffClaims.sincronizarStaffExistente;