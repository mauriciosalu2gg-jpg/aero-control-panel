import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// En producción, JWT_SECRET DEBE estar en las variables de entorno.
// Un secreto hardcodeado en el repo es un riesgo real de seguridad.
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[jwt.js] JWT_SECRET no está configurado. Define esta variable en Netlify → Site Settings → Environment variables.');
  } else {
    // En desarrollo, advertir en consola pero continuar (permite levantar sin .env completo)
    console.warn('[jwt.js] ⚠️  JWT_SECRET no está en las variables de entorno. Usando valor de desarrollo. NO uses esto en producción.');
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_not_for_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Genera un token JWT firmado con los datos del usuario.
 * @param {object} payload 
 * @returns {string} Token firmado
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verifica y decodifica un token JWT.
 * @param {string} token 
 * @returns {object|null} Payload decodificado si es válido, null de lo contrario
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}
