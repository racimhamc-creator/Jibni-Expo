import express, { Request, Response } from 'express';
import axios from 'axios';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = express.Router();

const GOOGLE_MAPS_SERVER_API_KEY = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

/**
 * POST /api/google/routes
 * Compute route between two points using Google Routes API v2
 * Replaces frontend direct call to routes.googleapis.com
 */
router.post('/routes', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { origin, destination, travelMode = 'DRIVE', routingPreference = 'TRAFFIC_AWARE' } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ message: 'origin and destination are required' });
    }

    if (!GOOGLE_MAPS_SERVER_API_KEY) {
      return res.status(500).json({ message: 'Server API key not configured' });
    }

    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: origin.latitude || origin.lat,
            longitude: origin.longitude || origin.lng,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.latitude || destination.lat,
            longitude: destination.longitude || destination.lng,
          },
        },
      },
      travelMode,
      routingPreference,
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false,
      },
      languageCode: 'en',
      units: 'METRIC',
    };

    const fieldMask = [
      'routes.distanceMeters',
      'routes.duration',
      'routes.polyline.encodedPolyline',
      'routes.legs.steps.navigationInstruction',
      'routes.legs.steps.startLocation',
      'routes.legs.steps.endLocation',
      'routes.legs.steps.distanceMeters',
      'routes.legs.steps.staticDuration',
      'routes.legs.startLocation',
      'routes.legs.endLocation',
    ].join(',');

    const response = await axios.post(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_SERVER_API_KEY,
          'X-Goog-FieldMask': fieldMask,
        },
        timeout: 10000,
      }
    );

    const data = response.data;

    if (data.error) {
      console.error('Google Routes API error:', data.error);
      return res.status(403).json({ message: data.error.message || 'Routes API error' });
    }

    const route = data.routes?.[0];
    if (!route) {
      return res.status(404).json({ message: 'No route found' });
    }

    // Format response similar to frontend expectations
    const legs = route.legs || [];
    const totalDistance = legs.reduce((sum: number, leg: any) => sum + (leg.distance?.value || 0), 0);
    const totalDuration = legs.reduce((sum: number, leg: any) => sum + (leg.duration?.value || 0), 0);

    // Build steps array
    const steps = legs.flatMap((leg: any) =>
      (leg.steps || []).map((step: any) => ({
        instruction: step.navigationInstruction?.instructions || step.navigationInstruction?.instruction || 'Continue',
        distanceMeters: step.distanceMeters ?? 0,
        durationSeconds: step.staticDuration ?? 0,
        startCoord: step.startLocation?.latLng ? {
          latitude: step.startLocation.latLng.latitude,
          longitude: step.startLocation.latLng.longitude,
        } : null,
        endCoord: step.endLocation?.latLng ? {
          latitude: step.endLocation.latLng.latitude,
          longitude: step.endLocation.latLng.longitude,
        } : null,
        maneuver: step.navigationInstruction?.maneuver || 'STRAIGHT',
      }))
    );

    res.json({
      success: true,
      data: {
        distance: totalDistance,
        duration: totalDuration,
        encodedPolyline: route.polyline?.encodedPolyline,
        steps,
        startLocation: legs[0]?.startLocation?.latLng || origin,
        endLocation: legs[0]?.endLocation?.latLng || destination,
      },
    });
  } catch (error: any) {
    console.error('Routes API error:', error.message);
    res.status(500).json({ message: error.response?.data?.error?.message || error.message || 'Failed to compute route' });
  }
});

/**
 * POST /api/google/nearest-road
 * Snap GPS point to nearest road using Google Roads API
 */
router.post('/nearest-road', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'latitude and longitude are required' });
    }

    if (!GOOGLE_MAPS_SERVER_API_KEY) {
      return res.status(500).json({ message: 'Server API key not configured' });
    }

    const response = await axios.post(
      'https://roads.googleapis.com/v1/nearestRoads',
      {
        points: [{ latitude, longitude }],
      },
      {
        params: { key: GOOGLE_MAPS_SERVER_API_KEY },
        timeout: 5000,
      }
    );

    const snappedPoints = response.data.snappedPoints;

    if (!snappedPoints || snappedPoints.length === 0) {
      return res.json({
        success: true,
        data: { location: { latitude, longitude }, originalLocation: { latitude, longitude } },
      });
    }

    const point = snappedPoints[0];

    res.json({
      success: true,
      data: {
        location: {
          latitude: point.location.latitude,
          longitude: point.location.longitude,
        },
        originalLocation: { latitude, longitude },
        placeId: point.placeId || null,
      },
    });
  } catch (error: any) {
    console.error('Nearest Roads API error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to get nearest road' });
  }
});

/**
 * POST /api/google/snap-road
 * Snap multiple GPS points to road path using Google Roads API
 */
router.post('/snap-road', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { points } = req.body;

    if (!points || !Array.isArray(points) || points.length === 0) {
      return res.status(400).json({ message: 'points array is required' });
    }

    if (!GOOGLE_MAPS_SERVER_API_KEY) {
      return res.status(500).json({ message: 'Server API key not configured' });
    }

    const pathPoints = points.map((p: any) => ({
      latitude: p.latitude || p.lat,
      longitude: p.longitude || p.lng,
    }));

    const response = await axios.post(
      'https://roads.googleapis.com/v1/snapToRoads',
      {
        path: pathPoints,
        interpolate: true,
      },
      {
        params: { key: GOOGLE_MAPS_SERVER_API_KEY },
        timeout: 10000,
      }
    );

    const snappedPoints = response.data.snappedPoints || [];

    res.json({
      success: true,
      data: {
        snappedPoints: snappedPoints.map((point: any) => ({
          location: {
            latitude: point.location.latitude,
            longitude: point.location.longitude,
          },
          originalIndex: point.originalIndex,
          placeId: point.placeId || null,
        })),
      },
    });
  } catch (error: any) {
    console.error('Snap to Roads API error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to snap to road' });
  }
});

/**
 * POST /api/google/eta
 * Get travel time and distance using Google Distance Matrix API
 */
router.post('/eta', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { origin, destination, mode = 'driving' } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ message: 'origin and destination are required' });
    }

    if (!GOOGLE_MAPS_SERVER_API_KEY) {
      return res.status(500).json({ message: 'Server API key not configured' });
    }

    const originStr = `${origin.latitude || origin.lat},${origin.longitude || origin.lng}`;
    const destStr = `${destination.latitude || destination.lat},${destination.longitude || destination.lng}`;

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/distancematrix/json',
      {
        params: {
          origins: originStr,
          destinations: destStr,
          mode,
          departure_time: 'now',
          key: GOOGLE_MAPS_SERVER_API_KEY,
        },
        timeout: 5000,
      }
    );

    const data = response.data;

    if (data.status !== 'OK') {
      return res.status(400).json({ message: data.error_message || 'Distance Matrix API error' });
    }

    const row = data.rows[0];
    const element = row?.elements?.[0];

    if (element?.status !== 'OK') {
      return res.status(404).json({ message: 'No route found' });
    }

    res.json({
      success: true,
      data: {
        distance: element.distance?.value || 0,
        distanceText: element.distance?.text || '0 m',
        duration: element.duration?.value || 0,
        durationText: element.duration?.text || '0 min',
        durationInTraffic: element.duration_in_traffic?.value || element.duration?.value || 0,
        durationInTrafficText: element.duration_in_traffic?.text || element.duration?.text || '0 min',
      },
    });
  } catch (error: any) {
    console.error('Distance Matrix API error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to get ETA' });
  }
});

/**
 * POST /api/google/geocode
 * Reverse geocode coordinates to address
 */
router.post('/geocode', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'latitude and longitude are required' });
    }

    if (!GOOGLE_MAPS_SERVER_API_KEY) {
      return res.status(500).json({ message: 'Server API key not configured' });
    }

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          latlng: `${latitude},${longitude}`,
          key: GOOGLE_MAPS_SERVER_API_KEY,
        },
        timeout: 5000,
      }
    );

    const data = response.data;

    if (data.status !== 'OK' || !data.results?.[0]) {
      return res.status(404).json({ message: 'No address found for location' });
    }

    const result = data.results[0];

    res.json({
      success: true,
      data: {
        address: result.formatted_address,
        placeId: result.place_id,
        addressComponents: result.address_components,
      },
    });
  } catch (error: any) {
    console.error('Geocoding API error:', error.message);
    res.status(500).json({ message: error.message || 'Failed to geocode' });
  }
});

export default router;
