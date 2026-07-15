/**
 * @file performanceManager.js
 * @description Módulo avanzado de gestión de rendimiento. Detecta hardware y adapta la UI.
 * Asigna perfiles de calidad: 'ultra', 'high', 'medium', 'low'.
 * 
 * Dependencias: eventBus, coreConfig
 * Eventos Emitidos: 'quality-changed'
 * Eventos Escuchados: 'engine-tick'
 * Variables CSS controladas: Añade clases al body (e.g., 'quality-low')
 */

import { eventBus } from './eventBus.js';
import { CONFIG } from './coreConfig.js';

class PerformanceManager {
  constructor() {
    this.quality = CONFIG.DEFAULT_QUALITY;
    this.fpsHistory = [];
    this.frameCount = 0;
    this.lastFpsTime = performance.now();
    
    // Hardware info
    this.deviceMemory = navigator.deviceMemory || 4;
    this.hardwareConcurrency = navigator.hardwareConcurrency || 4;
    this.isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  init() {
    this.evaluateInitialHardware();
    
    // Escuchar el bucle central para calcular FPS
    eventBus.on('engine-tick', (now) => this.calculateFps(now));

    // Escuchar cambios en preferencias de usuario (Motion)
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.prefersReducedMotion = e.matches;
      this.enforceQuality();
    });
  }

  evaluateInitialHardware() {
    if (this.prefersReducedMotion || this.deviceMemory <= 2 || this.hardwareConcurrency <= 2) {
      this.setQuality('low');
    } else if (this.isMobile) {
      this.setQuality('medium');
    } else if (this.deviceMemory >= 8 && this.hardwareConcurrency >= 8) {
      this.setQuality('ultra');
    } else {
      this.setQuality('high');
    }
  }

  calculateFps(now) {
    this.frameCount++;
    const delta = now - this.lastFpsTime;
    
    if (delta >= 1000) {
      const fps = (this.frameCount * 1000) / delta;
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > 5) this.fpsHistory.shift();
      
      this.analyzePerformance();
      
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }

  analyzePerformance() {
    if (this.fpsHistory.length < 5) return;
    const avgFps = this.fpsHistory.reduce((a, b) => a + b) / this.fpsHistory.length;

    if (avgFps < CONFIG.FPS_LOW && this.quality !== 'low') {
      this.setQuality('low');
    } else if (avgFps < CONFIG.FPS_MEDIUM && this.quality === 'high') {
      this.setQuality('medium');
    }
  }

  setQuality(newQuality) {
    if (this.quality === newQuality) return;
    
    // Clean old class
    document.body.classList.remove(`quality-${this.quality}`);
    
    this.quality = newQuality;
    this.enforceQuality();
  }

  enforceQuality() {
    document.body.classList.add(`quality-${this.quality}`);
    if (this.prefersReducedMotion) document.body.classList.add('reduced-motion');
    else document.body.classList.remove('reduced-motion');

    console.log(`[PerformanceManager] Quality set to: ${this.quality}`);
    eventBus.emit('quality-changed', this.quality);
  }
}

export const perfManager = new PerformanceManager();
