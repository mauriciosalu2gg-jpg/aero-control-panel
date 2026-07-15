import { verifyToken } from '../utils/jwt.js';
import { errorResponse, successResponse } from '../utils/responses.js';

// IP rate limit cache en memoria (de carácter temporal por ciclo de vida de la lambda)
const rateLimitCache = new Map();
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000; // 15 mins
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 100;

/**
 * Compositor de Middlewares para Netlify Functions.
 * Ejecuta cada middleware secuencialmente. Si uno retorna una respuesta, se interrumpe y se devuelve dicha respuesta.
 */
export function withMiddlewares(...middlewares) {
  return (handler) => async (event, context) => {
    // Manejar preflight CORS de manera global
    if (event.httpMethod === 'OPTIONS') {
      return successResponse({ message: 'CORS OK' }, 200);
    }
    
    for (const mw of middlewares) {
      const response = await mw(event, context);
      if (response) return response; // Detiene la ejecución y retorna la respuesta de error o preflight
    }
    return handler(event, context);
  };
}

/**
 * Middleware para habilitar CORS (Control de orígenes cruzados).
 */
export async function corsMiddleware(event) {
  // Ya manejado el OPTIONS en el compositor, pero sirve para adjuntar cabeceras si se usa individualmente.
  return null; 
}

/**
 * Middleware para validar el Token de Cloudflare Turnstile en peticiones críticas.
 */
export async function turnstileMiddleware(event) {
  const { TURNSTILE_SECRET_KEY, NODE_ENV } = process.env;

  // Saltarse la validación en desarrollo si no está configurada la llave secreta
  if (NODE_ENV === 'development' && (!TURNSTILE_SECRET_KEY || TURNSTILE_SECRET_KEY.startsWith('1x000'))) {
    console.log('Turnstile: Omitiendo validación en desarrollo (usando claves de test).');
    return null;
  }

  let token = '';
  try {
    const body = JSON.parse(event.body || '{}');
    token = body.turnstileToken || body['cf-turnstile-response'] || '';
  } catch (e) {
    // Si es multipart (FormData), buscaremos en el parseo correspondiente (se maneja en lógicas de FormData)
  }

  if (!token) {
    return errorResponse('Verificación de seguridad (Captcha) requerida', 400);
  }

  try {
    const verificationUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const response = await fetch(verificationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(TURNSTILE_SECRET_KEY)}&response=${encodeURIComponent(token)}&remoteip=${encodeURIComponent(event.headers['client-ip'] || '')}`
    });

    const result = await response.json();
    if (!result.success) {
      return errorResponse('Error de verificación de seguridad (Captcha no válido o expirado)', 400);
    }
  } catch (err) {
    console.error('Error al verificar Turnstile:', err);
    return errorResponse('Error del servidor al procesar validación de captcha', 500);
  }

  return null;
}

/**
 * Middleware para validar autenticación mediante JSON Web Tokens (JWT).
 * Extrae e introduce el usuario autenticado en event.user.
 */
export async function authMiddleware(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return errorResponse('Acceso denegado. Token no suministrado.', 401);
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return errorResponse('Token no válido o expirado.', 401);
  }

  // Adjuntar el payload del usuario al objeto event para consumirse en el handler
  event.user = decoded;
  return null;
}

/**
 * Middleware de control de flujo por cuota de peticiones (Rate Limiter).
 */
export async function rateLimitMiddleware(event) {
  const ip = event.headers['client-ip'] || event.headers['x-nf-client-connection-ip'] || 'anonymous';
  const ahora = Date.now();

  if (!rateLimitCache.has(ip)) {
    rateLimitCache.set(ip, { count: 1, resetTime: ahora + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  const clientLimit = rateLimitCache.get(ip);
  if (ahora > clientLimit.resetTime) {
    clientLimit.count = 1;
    clientLimit.resetTime = ahora + RATE_LIMIT_WINDOW_MS;
    return null;
  }

  clientLimit.count++;
  if (clientLimit.count > RATE_LIMIT_MAX) {
    return errorResponse('Demasiadas solicitudes. Por favor, intenta más tarde.', 429);
  }

  return null;
}
