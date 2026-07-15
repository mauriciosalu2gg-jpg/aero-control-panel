/**
 * @file app.js
 * @description Punto de entrada principal para el Aero Panels Framework.
 */

import { eventBus } from './eventBus.js';
import { perfManager } from './performanceManager.js';
import { animationEngine } from './animationEngine.js';
import { skyEngine } from './skyEngine.js';
import { lightingEngine } from './lightingEngine.js';
import { weatherEngine } from './weatherEngine.js';
import { uiController } from './uiController.js';
import { API } from '../api.js';
import { startTelemetrySync, startLogsSync, stopAllSyncs, loadRealServers } from '../services.js';

class AeroPanelsApp {
  async init() {
    console.log('[AeroPanels] Booting Framework...');
    perfManager.init();
    skyEngine.init();
    lightingEngine.init();
    weatherEngine.init();
    uiController.init();
    animationEngine.start();

    // Check auth
    this.checkSession();
  }

  async checkSession() {
    const sessionToken = localStorage.getItem('session_token');
    const cachedUser = localStorage.getItem('panel_user');

    if (typeof uiController.runInitSequence === 'function') {
      uiController.runInitSequence(async () => {
        await this.validateAndRoute(sessionToken, cachedUser);
      });
    } else {
      await this.validateAndRoute(sessionToken, cachedUser);
    }
  }

  async validateAndRoute(sessionToken, cachedUser) {
    if (!sessionToken || !cachedUser) {
      uiController.showLogin();
      return;
    }

    try {
      const data = await API.validateSession();
      console.log('✅ Sesión válida para usuario:', data.usuario);
      uiController.showDashboard(data.usuario);
      this.startServices();
    } catch (err) {
      console.warn('⚠️ Sesión expirada o inválida:', err.message);
      uiController.showLogin();
    }
  }

  startServices() {
    startTelemetrySync();
    startLogsSync();
    loadRealServers();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new AeroPanelsApp();
  window.AeroApp = app; 
  app.init();
});
