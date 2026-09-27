/**
 * ENDPOINT: enviarContacto - GraveCare
 *
 * Referenciada como rewrite en firebase.json (/enviarContacto), pero antes
 * no existía como Cloud Function: el formulario contacto.html funcionaba
 * igual porque envía el correo directo con EmailJS desde el navegador y
 * solo respalda una copia en Firestore (colección contacto_mensajes).
 *
 * Esta función queda como respaldo server-side idempotente: guarda el
 * mensaje en la misma colección "contacto_mensajes" que ya usa contacto.html,
 * para el caso en que se quiera invocar el rewrite directamente (o dejar de
 * depender de EmailJS en el futuro) sin duplicar la lógica de guardado.
 */

const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// CORS básico: el formulario se sirve desde el mismo dominio (gravecare.cl)
// vía rewrite, pero se deja abierto por si se llama desde localhost en dev.
function setCorsHeaders(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

exports.enviarContacto = onRequest(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ok: false, error: "Método no permitido. Usa POST."});
    return;
  }

  try {
    const {nombre, email, telefono, mensaje} = req.body || {};

    if (!nombre || !email || !mensaje) {
      res.status(400).json({
        ok: false,
        error: "Faltan campos obligatorios: nombre, email y mensaje son requeridos.",
      });
      return;
    }

    const docRef = await db.collection("contacto_mensajes").add({
      nombre: String(nombre).trim(),
      email: String(email).trim(),
      telefono: telefono ? String(telefono).trim() : "",
      mensaje: String(mensaje).trim(),
      estado: "nuevo",
      origen: "cloud_function",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ok: true, id: docRef.id});
  } catch (error) {
    console.error("Error en enviarContacto:", error);
    res.status(500).json({ok: false, error: "Error interno al guardar el mensaje."});
  }
});
