import { db } from './firestore.js';

const LOGS_COLLECTION = 'logs';

/**
 * Registra un evento de auditoría en la base de datos Firestore.
 * @param {object} logData 
 * @returns {Promise<string>} ID del log insertado
 */
export async function registrarLog({ usuario = 'desconocido', accion, ip = 'unknown', userAgent = 'unknown', resultado = 'info', detalles = '' }) {
  const nuevoLog = {
    usuario: String(usuario),
    accion: String(accion),
    ip: String(ip),
    userAgent: String(userAgent),
    resultado: String(resultado), // 'ok', 'error', 'info', 'warn'
    detalles: String(detalles),
    fecha: new Date().toISOString()
  };

  try {
    const docRef = await db.collection(LOGS_COLLECTION).add(nuevoLog);
    return docRef.id;
  } catch (error) {
    console.error('Error al guardar log de auditoría:', error);
    return null;
  }
}

/**
 * Obtiene los últimos logs registrados en el sistema.
 * @param {number} limite 
 * @returns {Promise<Array>}
 */
export async function obtenerLogs(limite = 50) {
  const snapshot = await db.collection(LOGS_COLLECTION)
    .orderBy('fecha', 'desc')
    .limit(limite)
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
