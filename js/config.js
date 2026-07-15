/**
 * @file config.js
 * @description Configuración centralizada para el frontend de Aero Panels.
 * Soporta múltiples entornos (development, staging, production).
 */

const ENVIRONMENTS = {
  development: {
    apiUrl: '/api/v1',
    debug: true,
  },
  staging: {
    apiUrl: '/api/v1',
    debug: true,
  },
  production: {
    apiUrl: '/api/v1',
    debug: false,
  }
};

// Determinar el entorno de ejecución
let currentEnv = 'production';
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  currentEnv = 'development';
}

const activeConfig = ENVIRONMENTS[currentEnv];

export const CONFIG = {
  appName: 'Aero Panels',
  version: '4.0.0',
  environment: currentEnv,
  apiUrl: activeConfig.apiUrl,
  debug: activeConfig.debug,
  
  // Parámetros de actualización
  updateIntervalMs: 15000, // Intervalo de sincronización de estado (15s)
  logsRefreshIntervalMs: 10000, // Intervalo de refresco de logs (10s)
  
  // Clave del sitio Cloudflare Turnstile para desarrollo local (fallback)
  turnstileSiteKey: '1x00000000000000000000AA', // Usar clave de prueba por defecto
};

export default CONFIG;
