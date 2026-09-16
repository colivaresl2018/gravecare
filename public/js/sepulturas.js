/**
 * SCRIPT DE MIGRACIÓN - sepulturas.js
 * Ubicación: /js/migracion-sepulturas.js
 * 
 * Este script migra las sepulturas del array al formato correcto de subcollection
 * SOLO EJECUTAR UNA VEZ en Firebase Console o en un botón admin
 */

import { db } from "./firebaseConfig.js";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/**
 * MIGRACIÓN: Convierte sepulturas de array a subcollection
 * Ejecutar en Firebase Console → Cloud Functions o desde admin panel
 */
export async function migrarSepulturas() {
  console.log("🔄 Iniciando migración de sepulturas...");
  
  try {
    // 1. Obtener todos los usuarios
    const usuariosRef = collection(db, 'usuarios');
    const usuariosSnap = await getDocs(usuariosRef);

    let migradasTotal = 0;
    let erroresTotal = 0;

    // 2. Para cada usuario
    for (const usuarioDoc of usuariosSnap.docs) {
      const uid = usuarioDoc.id;
      const usuarioData = usuarioDoc.data();

      // 3. Si tiene sepulturas en array, migrar
      if (usuarioData.sepulturas && Array.isArray(usuarioData.sepulturas)) {
        console.log(`👤 Usuario: ${uid} - ${usuarioData.nombreCompleto}`);
        console.log(`📋 Sepulturas encontradas: ${usuarioData.sepulturas.length}`);

        for (const sepOld of usuarioData.sepulturas) {
          try {
            // Generar ID único para la sepultura
            const sepId = sepOld.id || `sep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Crear documento en subcollection con datos del usuario + datos de la sepultura
            const sepNueva = {
              // Datos del usuario
              uid: uid,
              nombreCompleto: usuarioData.nombreCompleto,
              nombres: usuarioData.nombres,
              apellidoPaterno: usuarioData.apellidoPaterno,
              apellidoMaterno: usuarioData.apellidoMaterno,
              email: usuarioData.email,
              telefono: usuarioData.telefono,
              direccion: usuarioData.direccion,
              comuna: usuarioData.comuna,
              region: usuarioData.region,
              rut: usuarioData.rut,
              
              // Datos de la sepultura (del array antiguo)
              id: sepId,
              nombre: sepOld.nombre || "Sepultura",
              tipo: sepOld.tipo || sepOld.cementerio,
              cementerio: sepOld.cementerio,
              cementerioNombre: sepOld.cementerio,
              numeroSepultura: sepOld.numeroSepultura,
              patio: sepOld.patio,
              sector: sepOld.sector,
              ubicacion: sepOld.ubicacion,
              plan: sepOld.plan,
              estado: sepOld.estado || "Servicio Activo",
              proximaVisita: sepOld.proximaVisita,
              esSpot: sepOld.esSpot || true,
              tipoSuscripcion: sepOld.tipoSuscripcion || "SPOT",
              
              // Control
              createdAt: serverTimestamp(),
              migratedAt: serverTimestamp(),
              migratedFrom: "arrayField"
            };

            // Guardar en subcollection
            const sepRef = doc(db, 'usuarios', uid, 'sepulturas', sepId);
            await setDoc(sepRef, sepNueva, { merge: true });

            console.log(`  ✅ Migrada: ${sepOld.nombre} (${sepId})`);
            migradasTotal++;

          } catch (error) {
            console.error(`  ❌ Error migrando sepultura:`, error);
            erroresTotal++;
          }
        }
      }
    }

    console.log(`
    ✅ MIGRACIÓN COMPLETADA
    ✅ Sepulturas migradas: ${migradasTotal}
    ❌ Errores: ${erroresTotal}
    `);

    return {
      success: true,
      migradasTotal,
      erroresTotal,
      mensaje: `Se migraron ${migradasTotal} sepulturas correctamente`
    };

  } catch (error) {
    console.error('❌ Error en migración:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * CREAR SEPULTURA CORRECTAMENTE
 * Esta función debe usarse en el formulario de contratación
 * 
 * @param {String} uid - UID del usuario
 * @param {Object} datosUsuario - Datos del usuario desde Firestore
 * @param {Object} datosSepultura - Datos específicos de la sepultura
 */
export async function crearSepultura(uid, datosUsuario, datosSepultura) {
  try {
    // Generar ID único
    const sepId = `sep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Combinar datos del usuario + datos de la sepultura
    const sepulturaDoc = {
      // Datos del usuario (automáticos)
      uid: uid,
      nombreCompleto: datosUsuario.nombreCompleto,
      nombres: datosUsuario.nombres,
      apellidoPaterno: datosUsuario.apellidoPaterno,
      apellidoMaterno: datosUsuario.apellidoMaterno,
      email: datosUsuario.email,
      telefono: datosUsuario.telefono,
      direccion: datosUsuario.direccion,
      comuna: datosUsuario.comuna,
      region: datosUsuario.region,
      rut: datosUsuario.rut,
      
      // Datos de la sepultura (del formulario)
      id: sepId,
      nombre: datosSepultura.nombre || "Sepultura",
      tipo: datosSepultura.tipo,
      cementerio: datosSepultura.cementerio,
      cementerioNombre: datosSepultura.cementerio,
      numeroSepultura: datosSepultura.numeroSepultura,
      patio: datosSepultura.patio,
      sector: datosSepultura.sector,
      ubicacion: datosSepultura.ubicacion,
      plan: datosSepultura.plan,
      estado: "Servicio Activo",
      proximaVisita: datosSepultura.proximaVisita,
      esSpot: true,
      tipoSuscripcion: "SPOT",
      
      // Timestamps
      createdAt: serverTimestamp(),
      activo: true
    };

    // Guardar en subcollection
    const sepRef = doc(db, 'usuarios', uid, 'sepulturas', sepId);
    await setDoc(sepRef, sepulturaDoc, { merge: true });

    console.log(`✅ Sepultura creada: ${sepId}`);
    return { success: true, id: sepId };

  } catch (error) {
    console.error('❌ Error creando sepultura:', error);
    return { success: false, error: error.message };
  }
}

/**
 * LISTAR TODAS LAS SEPULTURAS DE UN USUARIO
 * Mejor que sepulturas.js porque trae datos combinados
 * 
 * @param {String} uid - UID del usuario
 * @returns {Promise<Array>} Array de sepulturas con datos del usuario incluidos
 */
export async function listarSepulturasPorUsuario(uid) {
  try {
    const sepulturasRef = collection(db, 'usuarios', uid, 'sepulturas');
    const snapshot = await getDocs(sepulturasRef);

    const sepulturas = [];
    snapshot.forEach((doc) => {
      if (!doc.data().placeholder) {
        sepulturas.push({
          id: doc.id,
          ...doc.data()
        });
      }
    });

    return sepulturas;
  } catch (error) {
    console.error('❌ Error listando sepulturas:', error);
    return [];
  }
}
