import { api } from './api';
import { LocationCoord } from './directions';

export interface DistanceMatrixResult {
  distance: {
    text: string;
    value: number; // meters
  };
  duration: {
    text: string;
    value: number; // seconds
  };
  status: string;
}

export interface DistanceMatrixResponse {
  origins: string[];
  destinations: string[];
  rows: Array<{
    elements: DistanceMatrixResult[];
  }>;
  status: string;
}

/**
 * Calculate distance and duration between origins and destinations using Google Distance Matrix API
 */
export async function calculateDistanceMatrix(
  origins: LocationCoord[],
  destinations: LocationCoord[],
  options: {
    departureTime?: 'now' | number;
    trafficModel?: 'best_guess' | 'pessimistic' | 'optimistic';
  } = {}
): Promise<DistanceMatrixResponse | null> {
  try {
    console.log('🕐 Distance Matrix Service: Calculating for', {
      origins: origins.length,
      destinations: destinations.length,
      departureTime: options.departureTime || 'default',
    });

    const response = await api.post('/api/test/distance-matrix', {
      origins,
      destinations,
      departure_time: options.departureTime,
    }) as { data: { success: boolean; data: DistanceMatrixResponse } };

    if (response.data.success) {
      console.log('🕐 Distance Matrix Service: Got results for', origins.length, 'origins');
      return response.data.data;
    }

    return null;
  } catch (error) {
    console.error('🕐 Distance Matrix Service: Failed to calculate:', error);
    return null;
  }
}

/**
 * Get ETA from driver to destination with current traffic
 */
export async function getDriverETA(
  driverLocation: LocationCoord,
  destination: LocationCoord
): Promise<{ distance: number; duration: number } | null> {
  try {
    console.log('🕐 Distance Matrix Service: Getting driver ETA with traffic');
    
    const result = await calculateDistanceMatrix([driverLocation], [destination], {
      departureTime: 'now',
      trafficModel: 'best_guess',
    });

    if (result && result.rows[0] && result.rows[0].elements[0]) {
      const element = result.rows[0].elements[0];
      
      if (element.status === 'OK') {
        console.log('🕐 Distance Matrix Service: Driver ETA calculated:', {
          distance: element.distance.text,
          duration: element.duration.text,
        });
        
        return {
          distance: element.distance.value,
          duration: element.duration.value,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('🕐 Distance Matrix Service: Failed to get driver ETA:', error);
    return null;
  }
}

/**
 * Get ETAs for multiple drivers to a destination (for driver matching)
 */
export async function getDriverETAs(
  drivers: LocationCoord[],
  destination: LocationCoord
): Promise<Array<{ driverIndex: number; distance: number; duration: number }>> {
  try {
    console.log('🕐 Distance Matrix Service: Getting ETAs for', drivers.length, 'drivers');
    
    const result = await calculateDistanceMatrix(drivers, [destination], {
      departureTime: 'now',
    });

    if (!result) return [];

    return result.rows.map((row, index) => {
      const element = row.elements[0];
      if (element.status === 'OK') {
        return {
          driverIndex: index,
          distance: element.distance.value,
          duration: element.duration.value,
        };
      }
      return null;
    }).filter(Boolean) as Array<{ driverIndex: number; distance: number; duration: number }>;
  } catch (error) {
    console.error('🕐 Distance Matrix Service: Failed to get driver ETAs:', error);
    return [];
  }
}
