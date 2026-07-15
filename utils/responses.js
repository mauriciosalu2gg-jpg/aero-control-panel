/**
 * Genera una respuesta HTTP exitosa formateada para Netlify Functions.
 * @param {any} data 
 * @param {number} status 
 * @param {object} customHeaders 
 * @returns {object}
 */
export function successResponse(data, status = 200, customHeaders = {}) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      ...customHeaders
    },
    body: JSON.stringify(data)
  };
}

/**
 * Genera una respuesta HTTP de error formateada para Netlify Functions.
 * @param {string} message 
 * @param {number} status 
 * @returns {object}
 */
export function errorResponse(message, status = 400) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE'
    },
    body: JSON.stringify({ error: message })
  };
}
