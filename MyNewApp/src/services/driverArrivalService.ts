import { socketService } from './socket';
import { API_URL } from './api';
import { calculateDistance } from '../utils/distanceUtils';

export enum DriverState {
  FAR = 'far',
  APPROACHING = 'approaching',
  NEAR = 'near',
  ARRIVED = 'arrived',
}

export const getArrivalThreshold = (gpsAccuracy: number): number => {
  if (gpsAccuracy <= 20) return 50;
  if (gpsAccuracy <= 50) return 80;
  if (gpsAccuracy <= 100) return 120;
  return 150;
};

export const getDistanceState = (
  distance: number,
  threshold: number
): DriverState => {
  if (distance <= threshold) return DriverState.ARRIVED;
  if (distance <= 100) return DriverState.NEAR;
  if (distance <= 200) return DriverState.APPROACHING;
  return DriverState.FAR;
};

export const notifyDriverArrival = async (
  rideId: string,
  driverLat: number,
  driverLng: number,
  gpsAccuracy: number,
  distance: number,
  pickupLat?: number,
  pickupLng?: number
): Promise<{ socketSuccess: boolean; restSuccess: boolean }> => {
  let socketSuccess = false;
  let restSuccess = false;

  try {
    // Method 1: Socket (Primary - Fast) - use the existing method
    try {
      socketService.driverArrived(rideId);
      socketSuccess = true;
      console.log('📡 Sending arrival via Socket (primary)');
    } catch (socketError) {
      console.warn('⚠️ Socket driverArrived failed:', socketError);
    }

    // Method 2: REST API (Backup - Reliable)
    if (pickupLat && pickupLng) {
      console.log('🔄 Sending arrival via REST (backup)');
      try {
        const response = await fetch(`${API_URL}/api/driver/arrived`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rideId,
            driverLat,
            driverLng,
            gpsAccuracy,
            distance,
            pickupLat,
            pickupLng,
          }),
        });

        const result = await response.json();
        if (result.success) {
          console.log('✅ Driver arrival confirmed by server');
          restSuccess = true;
        } else {
          console.warn('⚠️ Server rejected arrival:', result.reason);
        }
      } catch (restError) {
        console.warn('⚠️ REST fallback failed:', restError);
      }
    }

    if (!socketSuccess && !restSuccess) {
      console.log('🔁 Scheduling retry in 3 seconds...');
      setTimeout(() => {
        notifyDriverArrival(
          rideId,
          driverLat,
          driverLng,
          gpsAccuracy,
          distance,
          pickupLat,
          pickupLng
        );
      }, 3000);
    }

    return { socketSuccess, restSuccess };
  } catch (error) {
    console.error('❌ Failed to notify arrival:', error);
    return { socketSuccess, restSuccess };
  }
};

export const validateArrivalServerSide = (
  driverLat: number,
  driverLng: number,
  pickupLat: number,
  pickupLng: number,
  gpsAccuracy: number
): { valid: boolean; serverDistance: number; threshold: number } => {
  const serverDistance = calculateDistance(
    driverLat,
    driverLng,
    pickupLat,
    pickupLng
  );
  const threshold = getArrivalThreshold(gpsAccuracy);

  return {
    valid: serverDistance <= threshold,
    serverDistance,
    threshold,
  };
};

export default {
  DriverState,
  getArrivalThreshold,
  getDistanceState,
  notifyDriverArrival,
  validateArrivalServerSide,
};
