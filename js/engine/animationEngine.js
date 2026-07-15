/**
 * @file animationEngine.js
 * @description Centralized rendering loop (requestAnimationFrame).
 * Drives all engines through the EventBus to maintain perfect sync and performance.
 * 
 * Dependencias: eventBus
 * Eventos Emitidos: 'engine-tick'
 * Eventos Escuchados: N/A
 */

import { eventBus } from './eventBus.js';

class AnimationEngine {
  constructor() {
    this.isRunning = false;
    this.lastTime = 0;
    this.animationFrameId = null;
    
    // Bind to preserve 'this'
    this.tick = this.tick.bind(this);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  tick(now) {
    if (!this.isRunning) return;

    const deltaTime = now - this.lastTime;
    this.lastTime = now;

    // Emit tick event to all subscribed engines (Sky, Lighting, Weather, Performance)
    eventBus.emit('engine-tick', { now, deltaTime });

    this.animationFrameId = requestAnimationFrame(this.tick);
  }
}

export const animationEngine = new AnimationEngine();
