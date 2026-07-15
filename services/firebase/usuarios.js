import { db } from './firestore.js';
import { hashPassword, comparePassword } from '../../utils/bcrypt.js';

const USERS_COLLECTION = 'usuarios';

/**
 * Busca un usuario por su username en Firestore.
 * @param {string} username 
 * @returns {Promise<object|null>} Datos del usuario con su ID interno o null
 */
export async function buscarPorUsername(username) {
  const usernameStr = String(username).toLowerCase().trim();
  
  let snapshot = await db.collection(USERS_COLLECTION)
    .where('username', '==', usernameStr)
    .limit(1)
    .get();

  if (snapshot.empty) {
    // Fallback para usuarios antiguos
    snapshot = await db.collection(USERS_COLLECTION)
      .where('numeroAdministrativo', '==', usernameStr)
      .limit(1)
      .get();
  }

  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

/**
 * Crea un nuevo usuario en Firestore garantizando que el username no esté duplicado.
 * @param {object} usuarioData 
 * @returns {Promise<string>} ID del documento del nuevo usuario
 */
export async function crearUsuario({ username, password, discordId = null, rol = 'user', estado = 'activo' }) {
  const usernameNorm = String(username).toLowerCase().trim();

  if (!/^[a-z0-9_\.]{3,32}$/.test(usernameNorm)) {
    throw new Error('El nombre de usuario solo puede contener letras, números, puntos y guiones bajos (3-32 caracteres)');
  }
  
  // Validar unicidad del username
  const existente = await buscarPorUsername(usernameNorm);
  if (existente) {
    throw new Error('El nombre de usuario ya está en uso');
  }

  // Cifrar la contraseña
  const hashedPassword = await hashPassword(password);

  const nuevoUsuario = {
    username: usernameNorm,
    password: hashedPassword,
    discordId: discordId ? String(discordId) : null,
    rol: rol,
    estado: estado,
    fechaCreacion: new Date().toISOString()
  };

  // Crear documento con ID autogenerado
  const docRef = await db.collection(USERS_COLLECTION).add(nuevoUsuario);
  return docRef.id;
}

/**
 * Verifica si las credenciales de username y contraseña son correctas.
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<object|null>} Datos públicos del usuario si es válido, null de lo contrario
 */
export async function verificarCredenciales(username, password) {
  const usuario = await buscarPorUsername(username);
  if (!usuario) return null;

  if (usuario.estado !== 'activo') {
    throw new Error('La cuenta está inactiva o suspendida');
  }

  const passValido = await comparePassword(password, usuario.password);
  if (!passValido) return null;

  // No retornar la contraseña
  const { password: _, ...datosPublicos } = usuario;
  return datosPublicos;
}

// Alias de compatibilidad para scripts existentes
export const buscarPorNumeroAdministrativo = buscarPorUsername;
