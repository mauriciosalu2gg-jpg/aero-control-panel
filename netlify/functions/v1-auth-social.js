import { withMiddlewares, rateLimitMiddleware } from '../../middleware/index.js';
import { successResponse, errorResponse } from '../../utils/responses.js';
import { db, adminAuth } from '../../services/firebase/firestore.js';
import { signToken } from '../../utils/jwt.js';

async function authSocialHandler(event, context) {
  if (event.httpMethod !== 'POST') {
    return errorResponse('Método no permitido', 405);
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return errorResponse('Body no válido', 400);
  }

  const { idToken } = body;

  if (!idToken) {
    return errorResponse('Token requerido', 400);
  }

  try {
    // Verificar token con Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    // Buscar si el usuario ya existe en Firestore
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    let rol = 'user';
    let username = name || (email ? email.split('@')[0] : uid);

    if (!userDoc.exists) {
      // Registrar nuevo usuario social
      await userRef.set({
        email: email || null,
        username,
        rol,
        picture: picture || null,
        authProvider: 'social',
        creadoEn: new Date().toISOString()
      });
    } else {
      // Si existe, mantener su rol y nombre de usuario actual
      const userData = userDoc.data();
      rol = userData.rol || 'user';
      username = userData.username || username;
    }

    // Generar JWT del Panel (misma firma que v1-auth.js)
    const token = signToken({
      id: uid,
      username,
      rol,
      email: email || null
    });

    return successResponse({
      token,
      usuario: {
        username,
        rol,
        email: email || null
      }
    });

  } catch (err) {
    console.error('Error en social auth:', err);
    return errorResponse('Error de autenticación: ' + err.message, 401);
  }
}

export const handler = withMiddlewares(rateLimitMiddleware)(authSocialHandler);
