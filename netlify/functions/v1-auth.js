import { withMiddlewares, rateLimitMiddleware } from '../../middleware/index.js';
import { successResponse, errorResponse } from '../../utils/responses.js';
import { crearUsuario, verificarCredenciales } from '../../services/firebase/usuarios.js';
import { crearSesion } from '../../services/firebase/sesiones.js';
import { registrarLog } from '../../services/firebase/logs.js';
import { signToken } from '../../utils/jwt.js';

async function authHandler(event, context) {
  if (event.httpMethod !== 'POST') {
    return errorResponse('Método no permitido', 405);
  }

  const ip = event.headers['client-ip'] || event.headers['x-nf-client-connection-ip'] || 'unknown';
  const userAgent = event.headers['user-agent'] || 'unknown';

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return errorResponse('Body no válido', 400);
  }

  const { action } = body;

  // ── ACCIÓN: REGISTRO ─────────────────────────────────
  if (action === 'register') {
    const { username, password, discordId } = body;

    if (!username || !password) {
      return errorResponse('Nombre de usuario y contraseña son requeridos', 400);
    }

    try {
      const docId = await crearUsuario({
        username,
        password,
        discordId,
        rol: 'user', // Rol básico para nuevos registros
        estado: 'activo'
      });

      await registrarLog({
        usuario: username,
        accion: 'registro_cuenta',
        ip,
        userAgent,
        resultado: 'ok',
        detalles: `Usuario registrado con éxito. ID: ${docId}`
      });

      return successResponse({ message: 'Usuario registrado con éxito', userId: docId }, 201);
    } catch (err) {
      await registrarLog({
        usuario: username,
        accion: 'registro_cuenta_fallido',
        ip,
        userAgent,
        resultado: 'error',
        detalles: err.message
      });
      return errorResponse(err.message || 'Error al registrar el usuario', 400);
    }
  }

  // ── ACCIÓN: INICIAR SESIÓN ────────────────────────────
  if (action === 'login') {
    // Soportar 'numeroAdministrativo' para clientes que tengan caché antiguo de api.js
    const username = body.username || body.numeroAdministrativo;
    const password = body.password;

    if (!username || !password) {
      return errorResponse('Nombre de usuario y contraseña son requeridos', 400);
    }

    try {
      const usuario = await verificarCredenciales(username, password);
      if (!usuario) {
        await registrarLog({
          usuario: username,
          accion: 'login_fallido',
          ip,
          userAgent,
          resultado: 'error',
          detalles: 'Credenciales inválidas'
        });
        return errorResponse('Credenciales incorrectas o usuario inexistente', 401);
      }

      // Crear sesión y guardar token hashed
      const sessionToken = await crearSesion(usuario.id, ip, userAgent);

      // Firmar token JWT para la sesión cliente (contiene datos públicos del rol)
      const token = signToken({
        id: usuario.id,
        username: usuario.username,
        rol: usuario.rol,
        discordId: usuario.discordId
      });

      await registrarLog({
        usuario: usuario.username,
        accion: 'login_exitoso',
        ip,
        userAgent,
        resultado: 'ok',
        detalles: `Sesión iniciada. Rol: ${usuario.rol}`
      });

      return successResponse({
        token,
        sessionToken, // Token plano guardado hashed en base de datos
        usuario: {
          username: usuario.username,
          rol: usuario.rol,
          discordId: usuario.discordId
        }
      });

    } catch (err) {
      await registrarLog({
        usuario: username,
        accion: 'login_error',
        ip,
        userAgent,
        resultado: 'error',
        detalles: err.message
      });
      return errorResponse(err.message || 'Error durante el inicio de sesión', 500);
    }
  }

  return errorResponse('Acción no soportada', 400);
}

export const handler = withMiddlewares(rateLimitMiddleware)(authHandler);
