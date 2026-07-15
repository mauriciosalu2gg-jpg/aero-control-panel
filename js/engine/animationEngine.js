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
    
    // Interaction tracking
    this.isIdle = false;
    this.idleTimeout = null;
    this.targetFps = 60;
    this.frameInterval = 1000 / this.targetFps;
    this.lastRenderTime = 0;
    
    // Bind to preserve 'this'
    this.tick = this.tick.bind(this);
    this.handleInteraction = this.handleInteraction.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);

    // Setup listeners
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('mousemove', this.handleInteraction, { passive: true });
    window.addEventListener('keydown', this.handleInteraction, { passive: true });
    window.addEventListener('touchstart', this.handleInteraction, { passive: true });
    this.handleInteraction();
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.stop();
    } else {
      this.start();
    }
  }

  handleInteraction() {
    this.isIdle = false;
    this.targetFps = 60;
    this.frameInterval = 1000 / this.targetFps;
    
    if (this.idleTimeout) clearTimeout(this.idleTimeout);
    this.idleTimeout = setTimeout(() => {
      this.isIdle = true;
      this.targetFps = 30; // Reduce to 30 FPS when idle
      this.frameInterval = 1000 / this.targetFps;
    }, 5000); // 5 seconds of inactivity
  }

  start() {
    if (this.isRunning || document.hidden) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.lastRenderTime = this.lastTime;
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

    this.animationFrameId = requestAnimationFrame(this.tick);

    // Throttle rendering based on target FPS
    const elapsed = now - this.lastRenderTime;
    if (elapsed < this.frameInterval) return;

    const deltaTime = now - this.lastTime;
    this.lastTime = now;
    this.lastRenderTime = now - (elapsed % this.frameInterval);

    // Emit tick event to all subscribed engines (Sky, Lighting, Weather, Performance)
    eventBus.emit('engine-tick', { now, deltaTime });
  }
}

export const animationEngine = new AnimationEngine();
