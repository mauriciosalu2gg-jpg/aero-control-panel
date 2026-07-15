/**
 * @file skyEngine.js
 * @description Maneja la órbita del sol/luna y colores del cielo.
 * Interpola dinámicamente los colores originales de Aero.
 * 
 * Dependencias: eventBus, coreConfig
 */

import { eventBus } from './eventBus.js';
import { CONFIG } from './coreConfig.js';

class SkyEngine {
  constructor() {
    this.currentAngle = 0; // 0 = dawn (left), 90 = noon (top), 180 = dusk (right), 270 = midnight (bottom)
    this.speed = 360 / (CONFIG.DAY_DURATION_SEC * 1000); 
    this.rootStyle = document.documentElement.style;
    
    // Define color stops for interpolation
    this.colorStops = [
      { // 0: Dawn
        angle: 0,
        colors: {
          '--sky-1': [255, 123, 84], '--sky-2': [255, 178, 107],
          '--sea-1': [147, 50, 158], '--sea-2': [68, 10, 103], '--sea-3': [25, 0, 51], '--sea-4': [10, 0, 20], '--sea-5': [5, 0, 10],
          '--sun-1': [255, 230, 200], '--sun-2': [255, 150, 80], '--sun-glow': [255, 100, 50, 0.6]
        }
      },
      { // 90: Noon
        angle: 90,
        colors: {
          '--sky-1': [74, 144, 226], '--sky-2': [135, 206, 235],
          '--sea-1': [28, 106, 168], '--sea-2': [16, 81, 133], '--sea-3': [10, 52, 88], '--sea-4': [5, 30, 55], '--sea-5': [2, 15, 30],
          '--sun-1': [255, 255, 255], '--sun-2': [255, 246, 201], '--sun-glow': [255, 209, 92, 0.5]
        }
      },
      { // 180: Dusk
        angle: 180,
        colors: {
          '--sky-1': [120, 30, 100], '--sky-2': [200, 80, 70],
          '--sea-1': [60, 20, 80], '--sea-2': [40, 10, 60], '--sea-3': [20, 5, 40], '--sea-4': [10, 2, 20], '--sea-5': [5, 0, 10],
          '--sun-1': [255, 200, 150], '--sun-2': [220, 80, 50], '--sun-glow': [200, 50, 20, 0.6]
        }
      },
      { // 270: Midnight
        angle: 270,
        colors: {
          '--sky-1': [10, 20, 40], '--sky-2': [5, 10, 20],
          '--sea-1': [10, 25, 45], '--sea-2': [5, 15, 30], '--sea-3': [3, 10, 20], '--sea-4': [1, 5, 10], '--sea-5': [0, 2, 5],
          '--sun-1': [220, 230, 255], '--sun-2': [180, 200, 240], '--sun-glow': [150, 180, 255, 0.3]
        }
      },
      { // 360: Dawn (wrap)
        angle: 360,
        colors: {
          '--sky-1': [255, 123, 84], '--sky-2': [255, 178, 107],
          '--sea-1': [147, 50, 158], '--sea-2': [68, 10, 103], '--sea-3': [25, 0, 51], '--sea-4': [10, 0, 20], '--sea-5': [5, 0, 10],
          '--sun-1': [255, 230, 200], '--sun-2': [255, 150, 80], '--sun-glow': [255, 100, 50, 0.6]
        }
      }
    ];
  }

  init() {
    eventBus.on('engine-tick', ({ deltaTime }) => this.update(deltaTime));
  }

  update(deltaTime) {
    this.currentAngle = (this.currentAngle + (this.speed * deltaTime)) % 360;
    
    // Calculate positions using trigonometry
    const rad = this.currentAngle * (Math.PI / 180);
    
    // Orbit (Origin at 50vw, 100vh)
    const sunX = 50 - Math.cos(rad) * CONFIG.ORBIT_RADIUS_X_VW;
    const sunY = 100 - Math.sin(rad) * CONFIG.ORBIT_RADIUS_Y_VH;

    this.rootStyle.setProperty('--sun-x', `${sunX}vw`);
    this.rootStyle.setProperty('--sun-y', `${sunY}vh`);
    this.rootStyle.setProperty('--light-angle', `${this.currentAngle}deg`);

    this.updateColors();
    
    eventBus.emit('time-changed', this.currentAngle);
  }

  updateColors() {
    let a = this.currentAngle;
    
    // Find surrounding stops
    let startStop, endStop;
    for (let i = 0; i < this.colorStops.length - 1; i++) {
      if (a >= this.colorStops[i].angle && a <= this.colorStops[i+1].angle) {
        startStop = this.colorStops[i];
        endStop = this.colorStops[i+1];
        break;
      }
    }
    
    // Calculate interpolation factor (0 to 1)
    const range = endStop.angle - startStop.angle;
    const factor = (a - startStop.angle) / range;
    
    // Interpolate colors
    for (const key in startStop.colors) {
      const c1 = startStop.colors[key];
      const c2 = endStop.colors[key];
      
      const r = Math.round(c1[0] + (c2[0] - c1[0]) * factor);
      const g = Math.round(c1[1] + (c2[1] - c1[1]) * factor);
      const b = Math.round(c1[2] + (c2[2] - c1[2]) * factor);
      
      if (c1.length === 4) { // with alpha
        const alpha = c1[3] + (c2[3] - c1[3]) * factor;
        this.rootStyle.setProperty(key, `rgba(${r},${g},${b},${alpha.toFixed(2)})`);
      } else {
        this.rootStyle.setProperty(key, `rgb(${r},${g},${b})`);
      }
    }
  }
}

export const skyEngine = new SkyEngine();
