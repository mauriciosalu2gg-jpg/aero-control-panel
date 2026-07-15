/**
 * @file api.js
 * @description Módulo de llamadas API a las Netlify Functions.
 * Gestiona el envío de tokens de autenticación JWT y maneja las respuestas.
 */

import { CONFIG } from './config.js';

/**
 * Obtiene el token de sesión de localStorage.
 * @returns {string|null} Token JWT
 */
function getAuthToken() {
  return localStorage.getItem('session_token');
}

/**
 * Realiza una petición fetch autenticada con soporte para JSON.
 * @param {string} endpoint Ruta relativa del endpoint
 * @param {object} options Opciones de fetch (method, body, etc.)
 * @returns {Promise<object>} Respuesta parseada de la API
 */
export async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${CONFIG.apiUrl}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errMsg = `Error de red: ${response.status} ${response.statusText}`;
    try {
      const errData = await response.json();
      errMsg = errData.error || errData.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  return response.json();
}

export const API = {
  /**
   * Realiza login en el sistema.
   * @param {string} username 
   * @param {string} password 
   */
  async login(username, password) {
    return apiFetch('/auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'login',
        username,
        password,
      }),
    });
  },

  /**
   * Registra un nuevo usuario.
   * @param {string} numeroAdministrativo 
   * @param {string} password 
   * @param {string} discordId 
   */
  async register(numeroAdministrativo, password, discordId) {
    return apiFetch('/auth', {
      method: 'POST',
      body: JSON.stringify({
        action: 'register',
        numeroAdministrativo,
        password,
        discordId,
      }),
    });
  },

  /**
   * Valida la sesión actual en el backend.
   */
  async validateSession() {
    return apiFetch('/session', { method: 'GET' });
  },

  /**
   * Obtiene la configuración del sistema (como claves de Turnstile).
   */
  async getConfig() {
    return apiFetch('/config', { method: 'GET' });
  },

  /**
   * Obtiene el estado actual del bot de Discord y APIs.
   */
  async getBotStatus() {
    return apiFetch('/admin?action=status', { method: 'GET' });
  },

  /**
   * Obtiene los logs de auditoría reales de Firestore.
   * @param {number} limite 
   */
  async getLogs(limite = 100) {
    return apiFetch(`/admin?action=logs&limite=${limite}`, { method: 'GET' });
  },

  /**
   * Obtiene la lista de servidores donde reside el bot de Discord.
   */
  async getServers() {
    return apiFetch('/admin?action=guilds', { method: 'GET' });
  },

  /**
   * Obtiene las solicitudes de recuperación de cuentas.
   * @param {string} estado ('pendiente', 'aprobado', 'rechazado')
   */
  async getRecoveries(estado = 'pendiente') {
    return apiFetch(`/admin?action=recoveries&estado=${estado}`, { method: 'GET' });
  },

  /**
   * Resuelve una solicitud de recuperación de cuenta.
   * @param {string} recoveryId 
   * @param {string} decision 
   * @param {string} comentarios 
   */
  async resolveRecovery(recoveryId, decision, comentarios) {
    return apiFetch('/admin?action=resolve-recovery', {
      method: 'POST',
      body: JSON.stringify({ recoveryId, decision, comentarios }),
    });
  },

  /**
   * Obtiene la configuración activa de IA del bot desde Firestore.
   */
  async getAiConfig() {
    return apiFetch('/admin?action=get-ai-config', { method: 'GET' });
  },

  async getAiHealth() {
    return apiFetch('/admin?action=get-ai-health', { method: 'GET' });
  },

  /**
   * Envia un mensaje al bot de Discord a través de Firestore.
   */
  async sendMessage(guildId, channelId, content) {
    return apiFetch('/admin?action=send-message', {
      method: 'POST',
      body: JSON.stringify({ guildId, channelId, content })
    });
  },

  /**
   * Guarda la configuración de IA (proveedor + API Key + modelo) en Firestore.
   * El backend auto-detecta el proveedor según el prefijo de la API Key.
   * @param {string} provider  Proveedor seleccionado en la UI
   * @param {string} apiKey   API Key (puede estar vacía para Ollama/local)
   * @param {string} model    Modelo a usar
   */
  async saveAiConfig(provider, apiKey, model) {
    return apiFetch('/admin?action=save-ai-config', {
      method: 'POST',
      body: JSON.stringify({ provider, apiKey, model }),
    });
  },
};

export default API;
