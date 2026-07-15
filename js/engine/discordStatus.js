/**
 * @file discordStatus.js
 * @description Capa de abstracción que obtiene datos del bot y los envía al EventBus.
 * No interactúa con el DOM. Permite cambiar fácilmente la fuente de datos (Firestore, REST, WS) en el futuro.
 * 
 * Dependencias: eventBus, API (para fetch)
 * Eventos Emitidos: 'bot-status-updated'
 */

import { eventBus } from './eventBus.js';
import { API } from '../api.js';

class DiscordStatus {
  constructor() {
    this.intervalId = null;
    this.refreshRateMs = 15000; // 15 seconds
  }

  init() {
    this.fetchData();
    this.intervalId = setInterval(() => this.fetchData(), this.refreshRateMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async fetchData() {
    try {
      const statusData = await API.getBotStatus();
      // Emite al bus, para que uiController o dashboard rendericen
      eventBus.emit('bot-status-updated', statusData);
    } catch (err) {
      console.warn('[DiscordStatus] Fallo al obtener estado:', err);
    }
  }
}

export const discordStatus = new DiscordStatus();
