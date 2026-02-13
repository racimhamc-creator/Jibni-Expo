export type MissionStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface Pricing {
  basePrice: number;
  distancePrice: number;
  totalPrice: number;
  currency: string;
}

export interface Distance {
  clientToDestination: number; // meters
  driverToClient: number; // meters
}

export interface ETA {
  clientToDestination: number; // seconds
  driverToClient: number; // seconds
}

export interface Mission {
  _id: string;
  missionId: string;
  clientId: string;
  driverId: string;
  status: MissionStatus;
  pickupLocation: Location;
  destinationLocation: Location;
  pricing: Pricing;
  distance: Distance;
  eta: ETA;
  requestedAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledBy?: 'client' | 'driver';
  createdAt: string;
  updatedAt: string;
}

export interface MissionRequest {
  driverId: string;
  pickupLocation: Location;
  destinationLocation: Location;
  vehicleType?: string;
}
