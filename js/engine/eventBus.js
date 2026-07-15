/**
 * @file eventBus.js
 * @description Implementación del patrón Pub/Sub para desacoplar módulos.
 * Ningún módulo del motor depende directamente de otro.
 *
 * Dependencias: Ninguna.
 * Eventos emitidos: N/A
 * Eventos escuchados: N/A
 */

class EventBus {
  constructor() {
    this.listeners = {};
  }

  /**
   * Suscribe una función a un evento.
   * @param {string} event Nombre del evento.
   * @param {function} callback Función a ejecutar.
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Desuscribe una función de un evento.
   * @param {string} event Nombre del evento.
   * @param {function} callback Función a remover.
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  /**
   * Emite un evento, llamando a todos los suscriptores.
   * @param {string} event Nombre del evento.
   * @param {any} data Datos opcionales a enviar a los suscriptores.
   */
  emit(event, data = null) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`[EventBus] Error in listener for event '${event}':`, err);
      }
    });
  }
}

export const eventBus = new EventBus();
