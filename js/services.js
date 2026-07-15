/**
 * @file services.js
 * @description Orquestación de servicios y bucles de sincronización del panel.
 */

import { API } from './api.js';
import { CONFIG } from './config.js';
import { renderServersList, renderLogsConsole, updateBotStatusCards } from './ui.js';
import { showNotification } from './utils.js';

let statusIntervalId = null;
let logsIntervalId = null;

/**
 * Inicia el loop de sincronización con Firestore para obtener estadísticas del bot.
 */
export function startTelemetrySync() {
  if (statusIntervalId) clearInterval(statusIntervalId);
  
  const fetchStatus = async () => {
    try {
      const status = await API.getBotStatus();
      updateBotStatusCards(status);
    } catch (err) {
      if (CONFIG.debug) console.warn('Error al sincronizar telemetría:', err);
    }
  };

  fetchStatus(); // Carga inicial
  statusIntervalId = setInterval(fetchStatus, CONFIG.updateIntervalMs);
}

/**
 * Inicia el loop de sincronización de los logs de auditoría.
 */
export function startLogsSync() {
  if (logsIntervalId) clearInterval(logsIntervalId);

  const fetchLogs = async () => {
    try {
      const logs = await API.getLogs(50);
      renderLogsConsole(logs);
    } catch (err) {
      if (CONFIG.debug) console.warn('Error al sincronizar registros de auditoría:', err);
    }
  };

  fetchLogs(); // Carga inicial
  logsIntervalId = setInterval(fetchLogs, CONFIG.logsRefreshIntervalMs);
}

/**
 * Detiene todos los loops activos al cerrar sesión.
 */
export function stopAllSyncs() {
  if (statusIntervalId) clearInterval(statusIntervalId);
  if (logsIntervalId) clearInterval(logsIntervalId);
  statusIntervalId = null;
  logsIntervalId = null;
}

/**
 * Carga los servidores reales de Discord y los pinta en el Dashboard.
 */
export async function loadRealServers() {
  try {
    const servers = await API.getServers();
    renderServersList(servers);
  } catch (err) {
    showNotification('No se pudieron cargar los servidores de Discord', 'error');
  }
}

/**
 * Inicializa el widget de Cloudflare Turnstile dinámicamente si existe en el formulario.
 */
export async function initializeTurnstile(callback) {
  const container = document.getElementById('turnstile-container');
  if (!container) return;

  try {
    const config = await API.getConfig();
    const siteKey = config.turnstileSiteKey || CONFIG.turnstileSiteKey;

    if (window.turnstile) {
      window.turnstile.render(container, {
        sitekey: siteKey,
        theme: 'dark',
        callback: callback
      });
    }
  } catch (err) {
    console.error('Error al inicializar Cloudflare Turnstile:', err);
  }
}
