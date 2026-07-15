import { successResponse } from '../../utils/responses.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Retorna las llaves públicas necesarias para el cliente (como el Turnstile Site Key).
 */
export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return successResponse({ message: 'CORS OK' }, 200);
  }

  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

  return successResponse({
    turnstileSiteKey
  });
}
