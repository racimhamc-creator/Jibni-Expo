/**
 * Driver Simulation Service
 * 
 * This module provides a simulation environment for testing driver navigation
 * without affecting production ride logic. It simulates GPS updates by feeding
 * fake locations along a route into the existing snapping and animation system.
 * 
 * IMPORTANT: This file is for development/testing only and is completely
 * separate from the production ride logic.
 */

import { getRoadRoute, RouteResult } from './directions';

// Re-export LocationCoord for convenience
export type LocationCoord = {
  latitude: number;
  longitude: number;
};

export interface SimulationConfig {
  startLocation: LocationCoord;
  endLocation: LocationCoord;
  speedKmh: number; // Simulation speed in km/h
  updateIntervalMs: number; // GPS update interval in milliseconds
}

export interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  currentIndex: number;
  totalPoints: number;
  progress: number; // 0 to 1
  currentPosition: LocationCoord | null;
  heading: number; // Degrees (0-360)
  route: RouteResult | null;
}

export type SimulationCallback = (position: LocationCoord, progress: number) => void;
export type SimulationCompleteCallback = () => void;

/**
 * Calculate distance between two coordinates in kilometers
 */
function getDistanceFromLatLonInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Driver Simulation Class
 * Manages the simulation state and movement along a route
 */
export class DriverSimulation {
  private config: SimulationConfig;
  private state: SimulationState;
  private intervalId: NodeJS.Timeout | null = null;
  private onPositionUpdate: SimulationCallback | null = null;
  private onComplete: SimulationCompleteCallback | null = null;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.state = {
      isRunning: false,
      isPaused: false,
      currentIndex: 0,
      totalPoints: 0,
      progress: 0,
      currentPosition: null,
      heading: 0,
      route: null,
    };
  }

  /**
   * Initialize the simulation by fetching a route
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🎮 Simulation: Initializing...');
      console.log('🎮 From:', this.config.startLocation);
      console.log('🎮 To:', this.config.endLocation);

      const route = await getRoadRoute(this.config.startLocation, this.config.endLocation);
      
      if (!route || route.coordinates.length < 2) {
        console.error('🎮 Simulation: Failed to fetch route');
        return false;
      }

      this.state.route = route;
      this.state.totalPoints = route.coordinates.length;
      this.state.currentPosition = route.coordinates[0];
      this.state.currentIndex = 0;
      this.state.progress = 0;

      console.log('🎮 Simulation: Route loaded with', route.coordinates.length, 'points');
      return true;
    } catch (error) {
      console.error('🎮 Simulation: Initialization failed:', error);
      return false;
    }
  }

  /**
   * Start the simulation
   */
  start(
    onPositionUpdate: SimulationCallback,
    onComplete?: SimulationCompleteCallback
  ): void {
    if (this.state.isRunning) {
      console.warn('🎮 Simulation: Already running');
      return;
    }

    if (!this.state.route) {
      console.error('🎮 Simulation: Not initialized');
      return;
    }

    this.onPositionUpdate = onPositionUpdate;
    this.onComplete = onComplete || null;
    this.state.isRunning = true;
    this.state.isPaused = false;

    console.log('🎮 Simulation: Started');

    // Calculate how many points to advance per interval based on speed
    const pointsPerInterval = this.calculatePointsPerInterval();

    this.intervalId = setInterval(() => {
      this.updatePosition(pointsPerInterval);
    }, this.config.updateIntervalMs);

    // Send initial position
    if (this.state.currentPosition) {
      this.onPositionUpdate(this.state.currentPosition, 0);
    }
  }

  /**
   * Pause the simulation
   */
  pause(): void {
    if (!this.state.isRunning || this.state.isPaused) return;
    
    this.state.isPaused = true;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('🎮 Simulation: Paused');
  }

  /**
   * Resume the simulation
   */
  resume(): void {
    if (!this.state.isRunning || !this.state.isPaused) return;

    this.state.isPaused = false;
    const pointsPerInterval = this.calculatePointsPerInterval();
    
    this.intervalId = setInterval(() => {
      this.updatePosition(pointsPerInterval);
    }, this.config.updateIntervalMs);
    
    console.log('🎮 Simulation: Resumed');
  }

  /**
   * Stop the simulation
   */
  stop(): void {
    this.state.isRunning = false;
    this.state.isPaused = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('🎮 Simulation: Stopped');
  }

  /**
   * Reset the simulation
   */
  reset(): void {
    this.stop();
    this.state.currentIndex = 0;
    this.state.progress = 0;
    this.state.currentPosition = this.state.route?.coordinates[0] || null;
    console.log('🎮 Simulation: Reset');
  }

  /**
   * Get current simulation state
   */
  getState(): SimulationState {
    return { ...this.state };
  }

  /**
   * Get the route coordinates
   */
  getRoute(): LocationCoord[] | null {
    return this.state.route?.coordinates || null;
  }

  /**
   * Calculate how many route points to advance per interval
   */
  private calculatePointsPerInterval(): number {
    if (!this.state.route) return 1;

    // Calculate average distance between points
    let totalDistance = 0;
    const coords = this.state.route.coordinates;
    
    for (let i = 0; i < Math.min(coords.length - 1, 10); i++) {
      totalDistance += getDistanceFromLatLonInKm(
        coords[i].latitude,
        coords[i].longitude,
        coords[i + 1].latitude,
        coords[i + 1].longitude
      );
    }
    
    const avgDistanceKm = totalDistance / Math.min(coords.length - 1, 10);
    const speedKmPerMs = this.config.speedKmh / 3600000; // km per millisecond
    const distancePerInterval = speedKmPerMs * this.config.updateIntervalMs;
    
    // Calculate points to advance (at least 1)
    const pointsPerInterval = Math.max(1, Math.round(distancePerInterval / avgDistanceKm));
    
    console.log('🎮 Simulation: Advancing', pointsPerInterval, 'points per interval');
    return pointsPerInterval;
  }

  /**
   * Calculate bearing between two points (heading)
   */
  private calculateBearing(start: LocationCoord, end: LocationCoord): number {
    const startLat = start.latitude * (Math.PI / 180);
    const startLng = start.longitude * (Math.PI / 180);
    const endLat = end.latitude * (Math.PI / 180);
    const endLng = end.longitude * (Math.PI / 180);

    const dLng = endLng - startLng;
    const x = Math.sin(dLng) * Math.cos(endLat);
    const y = Math.cos(startLat) * Math.sin(endLat) -
              Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

    let bearing = Math.atan2(x, y) * (180 / Math.PI);
    bearing = (bearing + 360) % 360; // Normalize to 0-360

    return bearing;
  }

  /**
   * Update the current position along the route
   */
  private updatePosition(pointsToAdvance: number): void {
    if (!this.state.route || !this.onPositionUpdate) return;

    const coords = this.state.route.coordinates;
    const newIndex = Math.min(this.state.currentIndex + pointsToAdvance, coords.length - 1);
    
    // Calculate heading to next point
    let heading = this.state.heading;
    if (newIndex < coords.length - 1) {
      heading = this.calculateBearing(coords[newIndex], coords[newIndex + 1]);
    }
    
    // Update state
    this.state.currentIndex = newIndex;
    this.state.currentPosition = coords[newIndex];
    this.state.heading = heading;
    this.state.progress = newIndex / (coords.length - 1);

    // Notify listener
    this.onPositionUpdate(coords[newIndex], this.state.progress);

    // Check if complete
    if (newIndex >= coords.length - 1) {
      console.log('🎮 Simulation: Reached destination!');
      this.stop();
      this.onComplete?.();
    }
  }
}

/**
 * Create a new simulation instance
 */
export function createSimulation(config: SimulationConfig): DriverSimulation {
  return new DriverSimulation(config);
}

/**
 * Default simulation config for testing
 */
export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  startLocation: { latitude: 36.3707, longitude: 2.4755 }, // Example: Blida area
  endLocation: { latitude: 36.5907, longitude: 2.4434 },   // Example: Tipaza
  speedKmh: 60, // 60 km/h average speed
  updateIntervalMs: 1500, // Update every 1.5 seconds
};
