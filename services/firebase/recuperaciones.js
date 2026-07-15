import { db } from './firestore.js';

const RECOVERY_COLLECTION = 'recuperaciones';

/**
 * Crea una nueva solicitud de recuperación de cuenta en la base de datos.
 * @param {object} datos 
 * @param {Array} archivosMeta Metadatos de archivos adjuntos cargados
 * @returns {Promise<string>} ID del documento creado
 */
export async function crearSolicitudRecuperacion({ numeroAdministrativo, nombre, email, discordId = null, motivo, detalles = '', ip = 'unknown' }, archivosMeta = []) {
  const nuevaSolicitud = {
    numeroAdministrativo: String(numeroAdministrativo),
    nombre: String(nombre),
    email: String(email),
    discordId: discordId ? String(discordId) : null,
    motivo: String(motivo),
    detalles: String(detalles),
    ip: ip,
    consentimiento: true,
    archivos: archivosMeta, // Guarda los metadatos de archivos cargados
    estado: 'pendiente',   // 'pendiente', 'aprobado', 'rechazado'
    fechaCreacion: new Date().toISOString(),
    fechaResolucion: null,
    adminQueResolvio: null,
    comentariosResolucion: null
  };

  const docRef = await db.collection(RECOVERY_COLLECTION).add(nuevaSolicitud);
  return docRef.id;
}

/**
 * Obtiene todas las solicitudes por estado.
 * @param {string} estado 
 * @returns {Promise<Array>} Lista de solicitudes
 */
export async function obtenerSolicitudes(estado = 'pendiente') {
  const snapshot = await db.collection(RECOVERY_COLLECTION)
    .where('estado', '==', estado)
    .orderBy('fechaCreacion', 'desc')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Actualiza el estado de una solicitud (aprobación / rechazo).
 * @param {string} id 
 * @param {string} adminId 
 * @param {string} estado 
 * @param {string} comentarios 
 * @returns {Promise<boolean>}
 */
export async function resolverSolicitud(id, adminId, estado, comentarios = '') {
  const docRef = db.collection(RECOVERY_COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return false;

  await docRef.update({
    estado: estado,
    adminQueResolvio: adminId,
    comentariosResolucion: comentarios,
    fechaResolucion: new Date().toISOString()
  });

  return true;
}
