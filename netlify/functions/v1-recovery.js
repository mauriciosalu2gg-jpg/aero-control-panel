import { withMiddlewares, rateLimitMiddleware } from '../../middleware/index.js';
import { successResponse, errorResponse } from '../../utils/responses.js';
import { parseMultipart } from '../../utils/multipart.js';
import { crearSolicitudRecuperacion } from '../../services/firebase/recuperaciones.js';
import { registrarLog } from '../../services/firebase/logs.js';

// Verificación manual de Turnstile para multipart/form-data
async function verificarTurnstileManual(token, ip) {
  const { TURNSTILE_SECRET_KEY, NODE_ENV } = process.env;
  if (NODE_ENV === 'development' && (!TURNSTILE_SECRET_KEY || TURNSTILE_SECRET_KEY.startsWith('1x000'))) {
    return true;
  }
  if (!token) return false;

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(TURNSTILE_SECRET_KEY)}&response=${encodeURIComponent(token)}&remoteip=${encodeURIComponent(ip)}`
    });
    const result = await response.json();
    return !!result.success;
  } catch (e) {
    console.error('Error al verificar captcha:', e);
    return false;
  }
}

async function recoveryHandler(event, context) {
  if (event.httpMethod !== 'POST') {
    return errorResponse('Método no permitido', 405);
  }

  const ip = event.headers['client-ip'] || event.headers['x-nf-client-connection-ip'] || 'unknown';
  const userAgent = event.headers['user-agent'] || 'unknown';

  try {
    // Parsea los campos y archivos desde FormData
    const { fields, files } = parseMultipart(event);

    const numeroAdministrativo = fields.numero_administrativo;
    const nombre = fields.nombre;
    const email = fields.email;
    const discordId = fields.discord_id;
    const motivo = fields.motivo;
    const detalles = fields.detalles || '';
    const turnstileToken = fields['cf-turnstile-response'] || '';

    // Validar campos requeridos
    if (!numeroAdministrativo || !nombre || !email || !motivo) {
      return errorResponse('Número administrativo, nombre, correo y motivo son obligatorios', 400);
    }

    // Validar captcha de Turnstile manualmente
    const turnstileValido = await verificarTurnstileManual(turnstileToken, ip);
    if (!turnstileValido) {
      return errorResponse('Verificación de seguridad (Captcha) inválida', 400);
    }

    // Procesar metadatos de archivos subidos
    const archivosMeta = files.map(file => ({
      name: file.name,
      filename: file.filename,
      contentType: file.contentType,
      sizeBytes: file.content.length
      // En un entorno de producción real, aquí subiríamos el buffer de file.content 
      // a Firebase Storage o Google Drive, y guardaríamos el enlace público resultante.
    }));

    // Registrar solicitud en Firestore
    const docId = await crearSolicitudRecuperacion({
      numeroAdministrativo,
      nombre,
      email,
      discordId,
      motivo,
      detalles,
      ip
    }, archivosMeta);

    await registrarLog({
      usuario: email,
      accion: 'solicitud_recuperacion_creada',
      ip,
      userAgent,
      resultado: 'ok',
      detalles: `Número administrativo: ${numeroAdministrativo}. Solicitud ID: ${docId}`
    });

    return successResponse({ 
      message: 'Solicitud de recuperación registrada con éxito', 
      recoveryId: docId 
    });

  } catch (err) {
    console.error('Error al procesar recuperación:', err);
    return errorResponse(err.message || 'Error del servidor al procesar la solicitud', 500);
  }
}

export const handler = withMiddlewares(rateLimitMiddleware)(recoveryHandler);
