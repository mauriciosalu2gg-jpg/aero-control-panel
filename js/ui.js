/**
 * @file ui.js
 * @description Módulo de renderizado de la UI de Aero Panels.
 * Maneja la inserción en el DOM de logs, servidores, estado del bot y notificaciones.
 */

import { formatDateTime, formatUptime } from './utils.js';

/**
 * Renderiza la lista de servidores en el contenedor correspondiente.
 * @param {Array} servers Lista de servidores con su información
 */
export function renderServersList(servers) {
  const container = document.getElementById('servers-list-container');
  if (!container) return;

  if (!servers || servers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No hay servidores de Discord registrados.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = servers.map(server => `
    <div class="server-card">
      <div class="server-info">
        <div class="server-icon-placeholder">
          ${server.name.charAt(0).toUpperCase()}
        </div>
        <div class="server-meta">
          <div class="server-name">${server.name}</div>
          <div class="server-id">${server.id}</div>
        </div>
      </div>
      <div class="server-stats">
        <div class="stat-pill">
          <span class="stat-label">Tokens:</span>
          <span class="stat-value">${server.tokensUsedTotal || 0}</span>
        </div>
        <div class="stat-pill">
          <span class="stat-label">Unido:</span>
          <span class="stat-value">${formatDateTime(server.addedAt).split(' ')[0]}</span>
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * Renderiza la consola de logs de auditoría.
 * @param {Array} logs Lista de logs desde Firestore
 */
export function renderLogsConsole(logs) {
  const container = document.getElementById('logs-terminal-content');
  if (!container) return;

  if (!logs || logs.length === 0) {
    container.innerHTML = `<div class="log-line system">// No se encontraron registros de auditoría.</div>`;
    return;
  }

  container.innerHTML = logs.map(log => {
    const timeStr = formatDateTime(log.timestamp).split(' ')[1] || '--:--:--';
    let typeClass = 'info';
    let prefix = 'ℹ️';

    if (log.type === 'error' || log.resultado === 'error') {
      typeClass = 'error';
      prefix = '❌';
    } else if (log.type === 'warning') {
      typeClass = 'warning';
      prefix = '⚠️';
    } else if (log.type === 'admin') {
      typeClass = 'admin';
      prefix = '🔑';
    } else if (log.type === 'system') {
      typeClass = 'system';
      prefix = '⚙️';
    }

    const usuarioStr = log.usuario ? `[Admin: ${log.usuario}]` : '';
    const detailsStr = log.detalles ? ` - ${log.detalles}` : '';

    return `
      <div class="log-line log-${typeClass}">
        <span class="log-time">${timeStr}</span>
        <span class="log-prefix">${prefix}</span>
        <span class="log-msg">${usuarioStr} ${log.mensaje || log.action || ''}${detailsStr}</span>
      </div>
    `;
  }).join('');

  // Auto scroll al final si está activado
  const term = document.getElementById('logs-terminal');
  if (term && term.dataset.autoscroll !== 'false') {
    term.scrollTop = term.scrollHeight;
  }
}

/**
 * Actualiza los indicadores visuales del estado del bot en el dashboard.
 * @param {object} status Información de estado (uptime, ping, memoria, modelos)
 */
export function updateBotStatusCards(status) {
  // Estado general
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  
  if (statusIndicator && statusText) {
    const isOnline = status.status === 'online';
    statusIndicator.className = `status-dot ${isOnline ? 'online' : 'offline'}`;
    statusText.textContent = isOnline ? 'EN LÍNEA' : 'FUERA DE LÍNEA';
  }

  // Métricas
  const valPing = document.getElementById('val-ping');
  const valUptime = document.getElementById('val-uptime');
  const valMemory = document.getElementById('val-memory');
  const valServersCount = document.getElementById('val-servers-count');

  if (valPing) valPing.textContent = status.latencyMs !== null ? `${status.latencyMs}ms` : '--';
  if (valUptime) valUptime.textContent = formatUptime(status.uptimeSeconds);
  if (valMemory) valMemory.textContent = status.memoryUsageMb !== null ? `${status.memoryUsageMb} MB` : '--';
  
  // APIs y Modelos
  const aiProvider = document.getElementById('val-ai-provider');
  const aiModel = document.getElementById('val-ai-model');

  if (aiProvider) aiProvider.textContent = String(status.activeAIProvider || '--').toUpperCase();
  if (aiModel) aiModel.textContent = status.activeAIModel || '--';

  // Estados de API individuales
  const apis = status.apisStatus || {};
  Object.keys(apis).forEach(apiName => {
    const el = document.getElementById(`api-status-${apiName}`);
    if (el) {
      const state = apis[apiName];
      el.className = `api-pill ${state}`;
      el.textContent = state.toUpperCase();
    }
  });
}
