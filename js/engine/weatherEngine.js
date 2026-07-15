/**
 * @file weatherEngine.js
 * @description Gestión de capas climáticas (nubes, olas) usando variables CSS.
 * 
 * Dependencias: eventBus, coreConfig
 * Eventos Emitidos: N/A
 * Eventos Escuchados: 'engine-tick' (para animaciones programáticas o de opacidad), 'quality-changed'
 * Variables CSS controladas: --wave-opacity, --cloud-opacity
 */

import { eventBus } from './eventBus.js';
import { CONFIG } from './coreConfig.js';

class WeatherEngine {
  constructor() {
    this.rootStyle = document.documentElement.style;
    this.currentQuality = CONFIG.DEFAULT_QUALITY;
  }

  init() {
    if (!CONFIG.ENABLE_WEATHER) {
      this.rootStyle.setProperty('--wave-opacity', '0');
      this.rootStyle.setProperty('--cloud-opacity', '0');
      return;
    }

    eventBus.on('quality-changed', (q) => {
      this.currentQuality = q;
      this.updateQualitySettings();
    });
    
    // Set base values
    this.updateQualitySettings();
  }

  updateQualitySettings() {
    if (this.currentQuality === 'low') {
      this.rootStyle.setProperty('--wave-opacity', '0.5'); // Less waves/opacity
      this.rootStyle.setProperty('--cloud-opacity', '0');  // Hide clouds on low
    } else {
      this.rootStyle.setProperty('--wave-opacity', '1');
      this.rootStyle.setProperty('--cloud-opacity', '1');
    }
  }
}

export const weatherEngine = new WeatherEngine();
