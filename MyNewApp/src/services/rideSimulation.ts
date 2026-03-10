/**
 * Ride Simulation Service
 * Client-side simulation for testing ride flow without backend dependencies
 */

import { LocationCoord } from '../services/directions';

export interface MockRide {
  rideId: string;
  pickupLocation: { lat: number; lng: number };
  destinationLocation: { lat: number; lng: number };
  status: 'new_request' | 'accepted' | 'driver_arrived' | 'in_progress' | 'completed';
  driverId: string;
  clientId: string;
  createdAt: Date;
}

export interface SimulationState {
  isActive: boolean;
  mockRide: MockRide | null;
  driverPosition: LocationCoord | null;
  simulationInterval: NodeJS.Timeout | null;
}

class RideSimulation {
  private state: SimulationState = {
    isActive: false,
    mockRide: null,
    driverPosition: null,
    simulationInterval: null,
  };

  private listeners: ((state: SimulationState) => void)[] = [];
  private driverMovementInterval: NodeJS.Timeout | null = null;

  /**
   * Subscribe to simulation state changes
   */
  subscribe(listener: (state: SimulationState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  /**
   * Get current simulation state
   */
  getState(): SimulationState {
    return { ...this.state };
  }

  /**
   * Start ride simulation
   */
  async startSimulation(
    pickupLocation: { lat: number; lng: number },
    destinationLocation: { lat: number; lng: number },
    driverId: string,
    clientId: string
  ): Promise<MockRide> {
    if (this.state.isActive) {
      throw new Error('Simulation already active');
    }

    const mockRide: MockRide = {
      rideId: `SIM_${Date.now()}`,
      pickupLocation,
      destinationLocation,
      status: 'new_request',
      driverId,
      clientId,
      createdAt: new Date(),
    };

    this.state.mockRide = mockRide;
    this.state.isActive = true;
    this.state.driverPosition = {
      latitude: pickupLocation.lat + 0.01, // Start 1km away from pickup
      longitude: pickupLocation.lng + 0.01,
    };

    this.notifyListeners();

    console.log('🎬 Ride Simulation Started:', mockRide);

    // Auto-accept after 2 seconds
    setTimeout(() => {
      this.acceptRide();
    }, 2000);

    return mockRide;
  }

  /**
   * Accept the mock ride
   */
  private acceptRide() {
    if (!this.state.mockRide) return;

    this.state.mockRide.status = 'accepted';
    this.notifyListeners();

    console.log('✅ Mock Ride Accepted');

    // Start moving driver to pickup
    this.startDriverMovement('pickup');
  }

  /**
   * Start smooth driver movement
   */
  private startDriverMovement(target: 'pickup' | 'destination') {
    if (!this.state.mockRide || !this.state.driverPosition) return;

    const targetLocation = target === 'pickup' 
      ? { latitude: this.state.mockRide.pickupLocation.lat, longitude: this.state.mockRide.pickupLocation.lng }
      : { latitude: this.state.mockRide.destinationLocation.lat, longitude: this.state.mockRide.destinationLocation.lng };

    console.log(`🚗 Driver moving to ${target}:`, targetLocation);

    this.driverMovementInterval = setInterval(() => {
      if (!this.state.driverPosition || !this.state.mockRide) return;

      // Calculate distance to target
      const distance = this.calculateDistance(
        this.state.driverPosition,
        targetLocation
      );

      // Move 10% closer each interval (smooth movement)
      const moveFactor = 0.1;
      const newPosition = {
        latitude: this.state.driverPosition.latitude + (targetLocation.latitude - this.state.driverPosition.latitude) * moveFactor,
        longitude: this.state.driverPosition.longitude + (targetLocation.longitude - this.state.driverPosition.longitude) * moveFactor,
      };

      this.state.driverPosition = newPosition;
      this.notifyListeners();

      // Check if arrived at target
      const newDistance = this.calculateDistance(newPosition, targetLocation);
      if (newDistance < 0.0003) { // ~30 meters
        clearInterval(this.driverMovementInterval!);
        this.driverMovementInterval = null;

        // Use the centralized arrival checking
        this.checkForArrival();
      }
    }, 500); // Update every 500ms for smooth movement
  }

  /**
   * Handle driver arrival at pickup
   */
  private handleDriverArrived() {
    if (!this.state.mockRide) return;

    this.state.mockRide.status = 'driver_arrived';
    this.notifyListeners();

    console.log('📍 Driver arrived at pickup');

    // Brief pause then start ride
    setTimeout(() => {
      this.startRide();
    }, 3000);
  }

  /**
   * Start the ride (move to destination)
   */
  private startRide() {
    if (!this.state.mockRide) return;

    this.state.mockRide.status = 'in_progress';
    this.notifyListeners();

    console.log('🚀 Ride started - moving to destination');

    // Start moving to destination
    this.startDriverMovement('destination');
  }

  /**
   * Handle ride completion
   */
  private handleRideCompleted() {
    if (!this.state.mockRide) return;

    this.state.mockRide.status = 'completed';
    this.notifyListeners();

    console.log('✅ Ride completed');

    // Auto-stop simulation after 2 seconds
    setTimeout(() => {
      this.stopSimulation();
    }, 2000);
  }

  /**
   * Check for arrival and handle status transitions
   */
  private checkForArrival() {
    if (!this.state.driverPosition || !this.state.mockRide) return;

    const targetLocation = this.state.mockRide.status === 'accepted' 
      ? { latitude: this.state.mockRide.pickupLocation.lat, longitude: this.state.mockRide.pickupLocation.lng }
      : { latitude: this.state.mockRide.destinationLocation.lat, longitude: this.state.mockRide.destinationLocation.lng };

    const distance = this.calculateDistance(
      this.state.driverPosition,
      targetLocation
    );

    // Check if arrived at target (30 meters threshold)
    if (distance < 0.0003) { // ~30 meters
      if (this.state.mockRide.status === 'accepted') {
        this.handleDriverArrived();
      } else if (this.state.mockRide.status === 'in_progress') {
        this.handleRideCompleted();
      }
    }
  }

  /**
   * Stop simulation
   */
  stopSimulation() {
    if (this.driverMovementInterval) {
      clearInterval(this.driverMovementInterval);
      this.driverMovementInterval = null;
    }

    this.state.isActive = false;
    this.state.mockRide = null;
    this.state.driverPosition = null;

    this.notifyListeners();

    console.log('🛑 Ride Simulation Stopped');
  }

  /**
   * Calculate distance between two coordinates
   */
  private calculateDistance(pos1: LocationCoord, pos2: LocationCoord): number {
    const R = 6371; // Earth's radius in km
    const dLat = (pos2.latitude - pos1.latitude) * Math.PI / 180;
    const dLon = (pos2.longitude - pos1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(pos1.latitude * Math.PI / 180) * Math.cos(pos2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Get simulated driver location for socket updates
   */
  getDriverLocation(): LocationCoord | null {
    return this.state.driverPosition;
  }

  /**
   * Get current mock ride for UI updates
   */
  getMockRide(): MockRide | null {
    return this.state.mockRide;
  }
}

// Export singleton instance
export const rideSimulation = new RideSimulation();
