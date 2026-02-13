export interface LocationData {
  lat: number;
  lng: number;
  heading?: number;
  timestamp: number;
}

export interface NearbyDriver {
  driverId: string;
  location: LocationData;
  distance: number; // meters
  profile?: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}
