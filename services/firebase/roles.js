import { db } from './firestore.js';

const ROLES_COLLECTION = 'roles';

// Permisos estáticos por defecto (fallback por si no se han inicializado en base de datos)
const DEFAULT_ROLE_PERMISSIONS = {
  lara: ['dashboard', 'discord_send', 'ai_settings', 'users_manage', 'logs_view', 'system_restart'],
  gio: ['dashboard', 'discord_send', 'ai_settings', 'users_manage'],
  admin: ['dashboard', 'discord_send', 'ai_settings'],
  user: ['dashboard']
};

/**
 * Obtiene los permisos asociados a un rol específico.
 * @param {string} roleName 
 * @returns {Promise<Array>} Lista de permisos autorizados
 */
export async function obtenerPermisosDeRol(roleName) {
  if (!roleName) return [];
  const normalizedRole = roleName.toLowerCase();

  try {
    const doc = await db.collection(ROLES_COLLECTION).doc(normalizedRole).get();
    if (doc.exists) {
      const data = doc.data();
      if (data && Array.isArray(data.permisos)) {
        return data.permisos;
      }
    }
  } catch (err) {
    console.error(`Error al obtener permisos de rol ${normalizedRole} de Firestore:`, err);
  }

  // Fallback a mapeo por defecto
  return DEFAULT_ROLE_PERMISSIONS[normalizedRole] || [];
}

/**
 * Verifica si un rol tiene un permiso determinado.
 * @param {string} roleName 
 * @param {string} permiso 
 * @returns {Promise<boolean>}
 */
export async function rolTienePermiso(roleName, permiso) {
  const permisos = await obtenerPermisosDeRol(roleName);
  return permisos.includes(permiso);
}

/**
 * Inicializa la colección de roles en Firestore con los esquemas por defecto si no existen.
 */
export async function inicializarRolesSiEsNecesario() {
  for (const [role, permisos] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const docRef = db.collection(ROLES_COLLECTION).doc(role);
    const doc = await docRef.get();
    if (!doc.exists) {
      await docRef.set({ permisos, descripcion: `Rol de tipo ${role}` });
    }
  }
}
