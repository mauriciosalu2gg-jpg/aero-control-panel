import { withMiddlewares, rateLimitMiddleware } from '../../middleware/index.js';
import { successResponse, errorResponse } from '../../utils/responses.js';
import { db } from '../../services/firebase/firestore.js';
import { validarSesion, eliminarSesion } from '../../services/firebase/sesiones.js';
import { buscarPorNumeroAdministrativo } from '../../services/firebase/usuarios.js';

async function sessionHandler(event, context) {
  const ip = event.headers['client-ip'] || event.headers['x-nf-client-connection-ip'] || 'unknown';

  // ── GET: Validar Sesión Activa ──────────────────────
  if (event.httpMethod === 'GET') {
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return errorResponse('Token no proveído', 401);
    }
    const tokenPlano = authHeader.split(' ')[1];

    try {
      const sesion = await validarSesion(tokenPlano);
      if (!sesion) {
        return errorResponse('Sesión inválida o expirada', 401);
      }

      // Obtener el usuario completo para verificar rol y estado actual
      const snapshot = await db.collection('usuarios').doc(sesion.usuarioId).get();
      if (!snapshot.exists || snapshot.data().estado !== 'activo') {
        return errorResponse('Usuario no válido o inactivo', 401);
      }
      
      const usuario = snapshot.data();

      return successResponse({
        valid: true,
        usuario: {
          numeroAdministrativo: usuario.numeroAdministrativo,
          rol: usuario.rol,
          discordId: usuario.discordId
        }
      });
    } catch (err) {
      return errorResponse('Error al validar sesión', 500);
    }
  }

  // ── DELETE: Cerrar Sesión (Logout) ────────────────────
  if (event.httpMethod === 'DELETE') {
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return errorResponse('Token no proveído', 400);
    }
    const tokenPlano = authHeader.split(' ')[1];

    try {
      const ok = await eliminarSesion(tokenPlano);
      if (!ok) {
        return errorResponse('No se pudo desactivar la sesión', 400);
      }
      return successResponse({ message: 'Sesión terminada con éxito' });
    } catch (err) {
      return errorResponse('Error al cerrar sesión', 500);
    }
  }

  return errorResponse('Método no permitido', 405);
}

export const handler = withMiddlewares(rateLimitMiddleware)(sessionHandler);
