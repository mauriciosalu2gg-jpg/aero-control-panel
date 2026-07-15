/**
 * @file lightingEngine.js
 * @description Modifica variables CSS de sombreado y reflejos según el ángulo de la luz.
 * 
 * Dependencias: eventBus, coreConfig
 * Eventos Emitidos: N/A
 * Eventos Escuchados: 'time-changed'
 * Variables CSS controladas: --shadow-x, --shadow-y, --shadow-color, --gui-glow-angle
 */

import { eventBus } from './eventBus.js';
import { CONFIG } from './coreConfig.js';

class LightingEngine {
  constructor() {
    this.rootStyle = document.documentElement.style;
  }

  init() {
    eventBus.on('time-changed', (angle) => this.update(angle));
  }

  update(angle) {
    if (!CONFIG.ENABLE_DYNAMIC_LIGHTING) return;
    
    const rad = angle * (Math.PI / 180);
    // Shadow drops in the opposite direction of the light source
    const shadowX = -Math.cos(rad) * 20; 
    const shadowY = Math.sin(rad) * 20; 
    
    // Light hits from the angle
    // In CSS linear-gradient, 0deg is up, 90deg is right.
    // Our orbit: 0 is left (dawn), 90 is top (noon), 180 is right (dusk).
    // Let's map our orbit angle to CSS gradient angle:
    // If sun is left (0), light comes from left. Gradient should point from left to right (90deg in CSS).
    const guiGlowAngle = (angle + 90) % 360;

    const isNight = angle > 180;
    const shadowColor = isNight ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.4)';
    const lightColor = isNight ? 'rgba(180, 200, 255, 0.1)' : 'rgba(255, 209, 92, 0.15)';

    this.rootStyle.setProperty('--shadow-x', `${shadowX}px`);
    this.rootStyle.setProperty('--shadow-y', `${shadowY}px`);
    this.rootStyle.setProperty('--shadow-color', shadowColor);
    this.rootStyle.setProperty('--light-color', lightColor);
    this.rootStyle.setProperty('--gui-glow-angle', `${guiGlowAngle}deg`);
  }
}

export const lightingEngine = new LightingEngine();
