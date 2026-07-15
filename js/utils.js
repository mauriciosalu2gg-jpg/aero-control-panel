/**
 * @file utils.js
 * @description Utilidades del sistema: formatos, notificaciones, sonido, y timers.
 */

/**
 * Formatea un timestamp de ISO a un string legible y localizado.
 * @param {string|Date} timestamp 
 * @returns {string} Fecha formateada
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return '--/--/---- --:--';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '--/--/---- --:--';
    return date.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '--/--/---- --:--';
  }
}

/**
 * Formatea segundos en un formato de duración legible (días, horas, minutos, segundos).
 * @param {number} seconds 
 * @returns {string} Duración formateada
 */
export function formatUptime(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return '--';
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);

  return parts.join(' ');
}

/**
 * Muestra una notificación visual en el panel.
 * @param {string} message Mensaje de la notificación
 * @param {string} type Tipo ('info', 'success', 'warning', 'error')
 */
export function showNotification(message, type = 'info') {
  // Buscar contenedor de notificaciones
  let container = document.getElementById('notif-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notif-container';
    container.className = 'notif-container';
    document.body.appendChild(container);
  }

  const notif = document.createElement('div');
  notif.className = `notif-toast notif-${type}`;
  notif.innerHTML = `
    <div class="notif-bar"></div>
    <div class="notif-content">${message}</div>
  `;

  container.appendChild(notif);

  // Reproducir sonido si está activado
  playNotificationSound(type);

  // Auto-eliminar
  setTimeout(() => {
    notif.classList.add('fade-out');
    setTimeout(() => notif.remove(), 400);
  }, 4000);
}

/**
 * Reproduce un sonido de notificación según las preferencias del usuario.
 * @param {string} type Tipo de notificación
 */
export function playNotificationSound(type) {
  const soundEnabled = localStorage.getItem('sound_enabled') !== '0';
  if (!soundEnabled) return;

  const soundPath = type === 'error' || type === 'warning' 
    ? '/lock-close.wav' 
    : '/lock-open.wav';

  try {
    const audio = new Audio(soundPath);
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch (e) {
    console.warn('No se pudo reproducir el sonido de notificación:', e);
  }
}

/**
 * Generador de ruido aleatorio para efectos visuales (Canvas).
 */
export class NoiseGenerator {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = Math.min(window.innerWidth, 800);
    this.canvas.height = Math.min(window.innerHeight, 600);
  }

  render() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const imgData = this.ctx.createImageData(w, h);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const val = Math.floor(Math.random() * 25);
      data[i] = val;     // R
      data[i+1] = val;   // G
      data[i+2] = val;   // B
      data[i+3] = 12;    // A (muy transparente)
    }

    this.ctx.putImageData(imgData, 0, 0);
  }
}
