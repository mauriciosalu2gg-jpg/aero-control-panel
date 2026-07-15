import crypto from 'crypto';
import { db } from './firestore.js';

const SESSIONS_COLLECTION = 'sesiones';
const SESSION_DURATION_MS = Number(process.env.SESSION_DURATION) || 24 * 60 * 60 * 1000; // 24 horas por defecto

/**
 * Genera un hash SHA-256 de un token en texto plano.
 * @param {string} token 
 * @returns {string} Token hash
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Crea una sesión para un usuario, guardando el token cifrado (hash).
 * @param {string} usuarioId 
 * @param {string} ip 
 * @param {string} userAgent 
 * @returns {Promise<string>} Token en texto plano (para enviarse al cliente de forma única)
 */
export async function crearSesion(usuarioId, ip = 'unknown', userAgent = 'unknown') {
  // Generar token seguro en texto plano
  const tokenPlano = crypto.randomBytes(32).toString('hex');
  const tokenHashed = hashToken(tokenPlano);

  const ahora = new Date();
  const fechaExpiracion = new Date(ahora.getTime() + SESSION_DURATION_MS);

  const nuevaSesion = {
    usuarioId: usuarioId,
    tokenHash: tokenHashed,
    ip: ip,
    userAgent: userAgent,
    fechaCreacion: ahora.toISOString(),
    fechaExpiracion: fechaExpiracion.toISOString(),
    activo: true
  };

  // Crear la sesión en Firestore con ID aleatorio
  await db.collection(SESSIONS_COLLECTION).add(nuevaSesion);

  return tokenPlano;
}

/**
 * Valida un token de sesión en texto plano contra la base de datos.
 * @param {string} tokenPlano 
 * @returns {Promise<object|null>} Datos de la sesión si es válida, null de lo contrario
 */
export async function validarSesion(tokenPlano) {
  if (!tokenPlano) return null;

  const tokenHashed = hashToken(tokenPlano);
  const snapshot = await db.collection(SESSIONS_COLLECTION)
    .where('tokenHash', '==', tokenHashed)
    .where('activo', '==', true)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const datos = doc.data();

  // Verificar fecha de expiración
  const ahora = new Date();
  if (ahora > new Date(datos.fechaExpiracion)) {
    // Expirar sesión lógicamente
    await doc.ref.update({ activo: false });
    return null;
  }

  return { id: doc.id, ...datos };
}

/**
 * Cierra/desactiva una sesión.
 * @param {string} tokenPlano 
 * @returns {Promise<boolean>}
 */
export async function eliminarSesion(tokenPlano) {
  if (!tokenPlano) return false;
  const tokenHashed = hashToken(tokenPlano);
  const snapshot = await db.collection(SESSIONS_COLLECTION)
    .where('tokenHash', '==', tokenHashed)
    .limit(1)
    .get();

  if (snapshot.empty) return false;

  await snapshot.docs[0].ref.update({ activo: false });
  return true;
}
