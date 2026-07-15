/**
 * @file coreConfig.js
 * @description Centralized configuration for the Aero Panels Framework.
 * No magic numbers allowed outside this file.
 */

export const CONFIG = {
  // Render & Logic Loop
  DAY_DURATION_SEC: 120, // Real-time duration of a full day cycle in seconds
  ORBIT_RADIUS_X_VW: 45, // Horizontal radius of the sun/moon orbit
  ORBIT_RADIUS_Y_VH: 70, // Vertical radius of the sun/moon orbit
  
  // Lighting
  LIGHT_INTENSITY: 1.0,
  
  // Performance Thresholds
  FPS_ULTRA: 60,
  FPS_HIGH: 50,
  FPS_MEDIUM: 30,
  FPS_LOW: 15,
  
  // Default values
  DEFAULT_QUALITY: 'high',
  
  // Feature Flags
  ENABLE_WEATHER: true,
  ENABLE_DYNAMIC_LIGHTING: true,
};
