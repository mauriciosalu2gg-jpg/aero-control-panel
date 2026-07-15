import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Genera un hash seguro para una contraseña en texto plano.
 * @param {string} password 
 * @returns {Promise<string>} Contraseña hasheada
 */
export async function hashPassword(password) {
  if (!password) throw new Error('Se requiere una contraseña para hashear');
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compara una contraseña en texto plano contra una hasheada.
 * @param {string} password 
 * @param {string} hashedPassword 
 * @returns {Promise<boolean>} True si coinciden, false de lo contrario
 */
export async function comparePassword(password, hashedPassword) {
  if (!password || !hashedPassword) return false;
  return bcrypt.compare(password, hashedPassword);
}
