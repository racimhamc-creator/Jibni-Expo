import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Coordinates } from '@/types/location';

export const useLocation = () => {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to access location was denied');
          setLoading(false);
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get location');
        setLoading(false);
      }
    })();
  }, []);

  const watchPosition = (callback: (location: Coordinates) => void) => {
    return Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // 10 seconds
        distanceInterval: 50, // 50 meters
      },
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocation(coords);
        callback(coords);
      }
    );
  };

  return { location, error, loading, watchPosition };
};
