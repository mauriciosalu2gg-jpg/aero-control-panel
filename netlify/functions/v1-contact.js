import { withMiddlewares, rateLimitMiddleware, turnstileMiddleware } from '../../middleware/index.js';
import { successResponse, errorResponse } from '../../utils/responses.js';
import { db } from '../../services/firebase/firestore.js';
import { registrarLog } from '../../services/firebase/logs.js';

async function contactHandler(event, context) {
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

  const { nombre, email, asunto, mensaje } = body;

  if (!nombre || !email || !asunto || !mensaje) {
    return errorResponse('Todos los campos son obligatorios', 400);
  }

  try {
    const nuevoContacto = {
      nombre: String(nombre),
      email: String(email),
      asunto: String(asunto),
      mensaje: String(mensaje),
      ip: ip,
      userAgent: userAgent,
      fechaCreacion: new Date().toISOString()
    };

    // Guardar en colección de contactos
    const docRef = await db.collection('contacto').add(nuevoContacto);

    // Guardar logs
    await registrarLog({
      usuario: email,
      accion: 'formulario_contacto_enviado',
      ip,
      userAgent,
      resultado: 'ok',
      detalles: `Asunto: ${asunto}. Mensaje ID: ${docRef.id}`
    });

    return successResponse({ message: 'Mensaje de contacto enviado con éxito', messageId: docRef.id });

  } catch (err) {
    await registrarLog({
      usuario: email,
      accion: 'formulario_contacto_error',
      ip,
      userAgent,
      resultado: 'error',
      detalles: err.message
    });
    return errorResponse('Error interno al enviar el mensaje de contacto', 500);
  }
}

// Ejecutar con Rate Limit y Verificación de Captcha Turnstile
export const handler = withMiddlewares(rateLimitMiddleware, turnstileMiddleware)(contactHandler);
