import { api } from './api';

export interface PlacePrediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

export interface PlaceDetails {
  lat: number;
  lng: number;
  address: string;
  name: string;
}

/**
 * Search for places using Google Places Autocomplete API
 */
export async function searchPlaces(query: string): Promise<PlacePrediction[]> {
  try {
    console.log('🔍 Places Service: Searching for:', query);
    
    const response = await api.post('/api/test/places-autocomplete', {
      input: query,
    }) as { data: any };

    console.log('🔍 Places Service: Raw response:', response.data);

    // Handle both wrapped and unwrapped responses
    let predictions: PlacePrediction[] = [];
    
    if (Array.isArray(response.data)) {
      // Direct array response
      predictions = response.data;
    } else if (response.data.success && response.data.data) {
      // Wrapped response
      predictions = response.data.data;
    }

    if (predictions.length > 0) {
      console.log('🔍 Places Service: Got', predictions.length, 'predictions');
      return predictions;
    } else {
      console.log('🔍 Places Service: No predictions found');
      return [];
    }
  } catch (error) {
    console.error('🔍 Places Service: Search failed:', error);
    return [];
  }
}

/**
 * Get place details using Google Geocoding API
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  try {
    console.log('📍 Places Service: Getting details for place_id:', placeId);
    
    const response = await api.post('/api/test/geocode', {
      place_id: placeId,
    }) as { data: any };

    console.log('📍 Places Service: Raw geocode response:', response.data);

    if (response.data.success && response.data.data) {
      console.log('📍 Places Service: Got place details:', {
        name: response.data.data.name,
        address: response.data.data.address,
        lat: response.data.data.lat,
        lng: response.data.data.lng,
      });
      return response.data.data;
    } else if (response.data.lat && response.data.lng) {
      // Handle direct response
      console.log('📍 Places Service: Got direct place details:', response.data);
      return response.data;
    }

    return null;
  } catch (error) {
    console.error('📍 Places Service: Details failed:', error);
    return null;
  }
}

/**
 * Search places and get details in one call
 */
export async function searchAndGetPlaceDetails(query: string): Promise<PlaceDetails | null> {
  try {
    // First search for predictions
    const predictions = await searchPlaces(query);
    if (predictions.length === 0) {
      console.log('📍 Places Service: No predictions found for:', query);
      return null;
    }

    // Get details for the first prediction
    const placeDetails = await getPlaceDetails(predictions[0].place_id);
    return placeDetails;
  } catch (error) {
    console.error('📍 Places Service: Combined search failed:', error);
    return null;
  }
}
