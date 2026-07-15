import { withMiddlewares, rateLimitMiddleware, authMiddleware } from '../../middleware/index.js';
import { successResponse, errorResponse } from '../../utils/responses.js';
import { db } from '../../services/firebase/firestore.js';

async function userHandler(event, context) {
  // El usuario decodificado se inyecta por el authMiddleware en event.user
  const { id, numeroAdministrativo, rol } = event.user;

  if (event.httpMethod === 'GET') {
    try {
      const doc = await db.collection('usuarios').doc(id).get();
      if (!doc.exists) {
        return errorResponse('Usuario no encontrado', 404);
      }

      const data = doc.data();
      return successResponse({
        id: doc.id,
        numeroAdministrativo: data.numeroAdministrativo,
        discordId: data.discordId,
        rol: data.rol,
        estado: data.estado,
        fechaCreacion: data.fechaCreacion
      });
    } catch (err) {
      return errorResponse('Error interno al obtener datos de perfil', 500);
    }
  }

  return errorResponse('Método no permitido', 405);
}

export const handler = withMiddlewares(rateLimitMiddleware, authMiddleware)(userHandler);
