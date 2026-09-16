/**
 * Utilidades de validación y formateo para RUT chileno
 * Proyecto: GraveCare (gravecare.cl)
 */

/**
 * Limpia y normaliza el RUT (elimina puntos, espacios y guion, pasa 'k' a mayúscula).
 * @param {string} rut - Ej: "12.345.678-k" o " 12345678-K "
 * @returns {string} - Ej: "12345678K"
 */
export function cleanRut(rut) {
  if (typeof rut !== 'string') return '';
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

/**
 * Formatea un RUT limpio con puntos y guion.
 * @param {string} rut - Ej: "12345678K"
 * @returns {string} - Ej: "12.345.678-K"
 */
export function formatRut(rut) {
  const cleaned = cleanRut(rut);
  if (cleaned.length < 2) return cleaned;
  
  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  
  // Agregar puntos al cuerpo
  let formattedBody = '';
  for (let i = body.length - 1, count = 0; i >= 0; i--, count++) {
    if (count > 0 && count % 3 === 0) {
      formattedBody = '.' + formattedBody;
    }
    formattedBody = body[i] + formattedBody;
  }
  
  return `${formattedBody}-${dv}`;
}

/**
 * Valida un RUT chileno mediante el algoritmo Módulo 11.
 * @param {string} rut
 * @returns {boolean}
 */
export function validateRut(rut) {
  const cleaned = cleanRut(rut);
  if (cleaned.length < 8 || cleaned.length > 9) return false;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  if (!/^\d+$/.test(body)) return false;

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedDvCalc = 11 - (sum % 11);
  let expectedDv = '';
  if (expectedDvCalc === 11) expectedDv = '0';
  else if (expectedDvCalc === 10) expectedDv = 'K';
  else expectedDv = expectedDvCalc.toString();

  return dv === expectedDv;
}

/**
 * Convierte un RUT limpio en un correo sintético para Firebase Auth.
 * @param {string} rut
 * @returns {string} - Ej: "12345678k@auth.gravecare.cl"
 */
export function rutToAuthEmail(rut) {
  const cleaned = cleanRut(rut);
  return `${cleaned.toLowerCase()}@auth.gravecare.cl`;
}
