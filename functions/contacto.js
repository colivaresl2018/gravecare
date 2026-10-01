const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const handleCors = require("./cors");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

exports.enviarContacto = onRequest(async (req, res) => {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Método no permitido. Usa POST." });
    return;
  }

  try {
    const { nombre, email, telefono, mensaje } = req.body || {};

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

    res.status(200).json({ ok: true, id: docRef.id });
  } catch (error) {
    console.error("Error en enviarContacto:", error);
    res.status(500).json({ ok: false, error: "Error interno al guardar el mensaje." });
  }
});