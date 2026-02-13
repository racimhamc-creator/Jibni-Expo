import { Client } from '@googlemaps/google-maps-services-js';

const client = new Client({});

export interface DirectionsResult {
  distance: number; // meters
  duration: number; // seconds
}

export const getDirections = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<DirectionsResult> => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY is not defined');
  }

  try {
    const response = await client.directions({
      params: {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        key: apiKey,
      },
    });

    const route = response.data.routes[0];
    const leg = route.legs[0];

    return {
      distance: leg.distance.value, // meters
      duration: leg.duration.value, // seconds
    };
  } catch (error) {
    console.error('Google Maps API error:', error);
    throw new Error('Failed to get directions');
  }
};

export const geocodeAddress = async (address: string): Promise<{
  lat: number;
  lng: number;
}> => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY is not defined');
  }

  try {
    const response = await client.geocode({
      params: {
        address,
        key: apiKey,
      },
    });

    const result = response.data.results[0];
    const location = result.geometry.location;

    return {
      lat: location.lat,
      lng: location.lng,
    };
  } catch (error) {
    console.error('Google Maps Geocoding error:', error);
    throw new Error('Failed to geocode address');
  }
};
