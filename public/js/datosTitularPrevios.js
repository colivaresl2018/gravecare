/**
 * DATOSTITULARPREVIOS.JS
 *
 * Cuando un cliente que YA tiene cuenta contrata otro servicio (para otra
 * sepultura), no debería tener que volver a escribir sus datos personales.
 * Este módulo busca los datos del titular en su última orden anterior y los
 * devuelve para precargar el formulario de contratación.
 *
 * Por qué se lee de "ordenes" y no del perfil "usuarios/{uid}":
 * el perfil guarda la dirección como UN solo texto ("Calle 123 Depto 4"),
 * pero los formularios de contratación la piden en tres campos separados
 * (calle, número, departamento). Cada orden anterior YA guarda el titular
 * con esos tres campos separados, exactamente en el formato que necesitan
 * los formularios — no hay que adivinar cómo partir un texto libre.
 *
 * Usa las mismas queries que sepulturas.html/dashboard.html (por usuarioId,
 * titular.email o emailCliente), que ya están cubiertas por las reglas de
 * Firestore para el dueño de la orden — no requiere permisos nuevos.
 *
 * Devuelve null si el cliente no está logueado o no tiene órdenes previas
 * (en ese caso el formulario funciona exactamente como antes, vacío).
 */

import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

function esperarUsuario() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

function fechaDeOrden(orden) {
  // createdAt puede ser Timestamp de Firestore, string ISO, o no existir.
  const c = orden.createdAt || orden.fechaCreacion || orden.fechaContratacion;
  if (!c) return 0;
  if (typeof c.toMillis === "function") return c.toMillis();
  const t = new Date(c).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Rellena en el formulario SOLO los campos del titular (nunca los de la
 * sepultura/difunto, que cambian en cada contratación). Todos los campos
 * quedan editables: el cliente puede haberse mudado, cambiado de teléfono
 * o querer que la contratación salga a nombre de otra persona.
 *
 * Orden importante: primero país, luego región, luego comuna — cada
 * select depende del anterior (al elegir región se cargan sus comunas),
 * así que hay que disparar el evento "change" de cada uno antes de
 * asignar el siguiente valor.
 */
export function rellenarCamposTitular(titular) {
  const ponerValor = (id, valor) => {
    const el = document.getElementById(id);
    if (el && valor !== undefined && valor !== null && valor !== "") el.value = valor;
  };

  ponerValor("nombresTitular", titular.nombres);
  ponerValor("apellidoPaternoTitular", titular.apellidoPaterno);
  ponerValor("apellidoMaternoTitular", titular.apellidoMaterno);
  ponerValor("rut", titular.rut || titular.rutDni);
  ponerValor("email", titular.email);
  ponerValor("telefono", titular.telefono);
  ponerValor("direccion", titular.direccion);
  ponerValor("numero", titular.numero);
  ponerValor("departamento", titular.departamento);

  const paisSelect = document.getElementById("pais");
  const regionSelect = document.getElementById("region");
  const comunaSelect = document.getElementById("comuna");
  const regionText = document.getElementById("regionText");
  const comunaText = document.getElementById("comunaText");

  if (paisSelect && titular.pais) {
    paisSelect.value = titular.pais;
    paisSelect.dispatchEvent(new Event("change"));
  }

  if (titular.pais === "Chile" || !titular.pais) {
    if (regionSelect && titular.region) {
      regionSelect.value = titular.region;
      regionSelect.dispatchEvent(new Event("change"));
    }
    if (comunaSelect && titular.comuna) {
      comunaSelect.value = titular.comuna;
    }
  } else {
    if (regionText && titular.region) regionText.value = titular.region;
    if (comunaText && titular.comuna) comunaText.value = titular.comuna;
  }
}

/**
 * Muestra un aviso discreto arriba del bloque de datos del titular, para
 * que el cliente entienda por qué ya aparecen llenos y sepa que puede
 * editarlos.
 */
export function mostrarAvisoDatosPrevios() {
  if (document.getElementById("aviso-datos-previos")) return;

  // El bloque del titular es: <h2 class="form-section-title">Datos del
  // Titular</h2> seguido de una grilla con los campos. El aviso va justo
  // después de ese título, antes de la grilla.
  const titulos = document.querySelectorAll("h2.form-section-title");
  const tituloTitular = [...titulos].find((h) =>
    h.textContent.trim().toLowerCase().includes("titular")
  );
  if (!tituloTitular) return;

  const aviso = document.createElement("div");
  aviso.id = "aviso-datos-previos";
  aviso.style.cssText =
    "background:#e8f5e9;border:1px solid #a8d5ba;color:#1a3a2e;border-radius:8px;" +
    "padding:10px 14px;margin-bottom:14px;font-size:0.85rem;";
  aviso.textContent =
    "Usamos tus datos guardados de tu contratación anterior. " +
    "Revísalos y edítalos si algo cambió.";
  tituloTitular.insertAdjacentElement("afterend", aviso);
}

export async function obtenerDatosTitularPrevios() {
  try {
    const user = await esperarUsuario();
    if (!user) return null;

    const emailLower = (user.email || "").toLowerCase().trim();
    const ordenesRef = collection(db, "ordenes");
    const encontradas = new Map();

    const consultas = [query(ordenesRef, where("usuarioId", "==", user.uid))];
    if (emailLower) {
      consultas.push(query(ordenesRef, where("titular.email", "==", emailLower)));
      consultas.push(query(ordenesRef, where("emailCliente", "==", emailLower)));
    }

    for (const q of consultas) {
      try {
        const snap = await getDocs(q);
        snap.forEach((d) => encontradas.set(d.id, d.data()));
      } catch (err) {
        // Una consulta que falle (por ejemplo por un índice faltante) no
        // debe impedir probar las otras dos.
        console.warn("Consulta de datos previos omitida:", err.message);
      }
    }

    if (encontradas.size === 0) return null;

    // La orden más reciente que tenga un titular con datos utilizables.
    const ordenadas = [...encontradas.values()]
      .filter((o) => o.titular && (o.titular.rut || o.titular.rutDni))
      .sort((a, b) => fechaDeOrden(b) - fechaDeOrden(a));

    if (ordenadas.length === 0) return null;
    return ordenadas[0].titular;
  } catch (err) {
    console.warn("No se pudieron cargar los datos previos del titular:", err);
    return null;
  }
}
