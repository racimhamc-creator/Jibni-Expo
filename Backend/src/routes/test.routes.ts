import { Router, Response } from 'express';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';
import { Mission } from '../models/Mission.js';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';
import { getDirections } from '../utils/maps.js';
import { Client } from '@googlemaps/google-maps-services-js';

const router = Router();

// TEMPORARY: Change user role (for testing only)
router.post('/change-role', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { role } = req.body;
    
    if (!['client', 'driver'].includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid role. Must be "client" or "driver"' 
      });
    }
    
    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { role } },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Update profile
    await Profile.findOneAndUpdate(
      { userId },
      { $set: { role, vehicleType: role === 'driver' ? 'car' : undefined } },
      { upsert: true }
    );
    
    res.json({
      success: true,
      message: `Role changed to ${role}`,
      user: {
        _id: user._id,
        phoneNumber: user.phoneNumber,
        role: user.role,
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to change role',
    });
  }
});

// Get current user info
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId as string;
    
    const user = await User.findById(userId);
    const profile = await Profile.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    res.json({
      success: true,
      data: {
        _id: user._id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVerified: user.isVerified,
        profile: profile || null,
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user',
    });
  }
});

// Test Google Directions API (for client destination selection)
router.post('/directions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { origin, destination } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ message: 'origin and destination required' });
    }

    console.log('🛣️ Test Google Directions from:', origin, 'to:', destination);
    const result = await getDirections(origin, destination);
    console.log('🛣️ Google Directions result:', {
      distance: result.distance,
      duration: result.duration,
      polylineLength: result.polyline.length,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('🛣️ Google Directions error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch directions' });
  }
});

// Test Google Places API (for destination autocomplete)
router.post('/places-autocomplete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) {
      return res.status(400).json({ message: 'input query required' });
    }

    console.log('🔍 Test Google Places Autocomplete for:', input);
    
    const client = new Client({});
    const response = await client.placeAutocomplete({
      params: {
        input,
        key: process.env.GOOGLE_MAPS_SERVER_API_KEY!,
        components: ['country:dz'], // Restrict to Algeria
      },
    });

    console.log('🔍 Google Places Autocomplete result:', {
      count: response.data.predictions.length,
      predictions: response.data.predictions.slice(0, 3).map(p => ({
        description: p.description,
        place_id: p.place_id,
      })),
    });

    res.json({
      success: true,
      data: response.data.predictions,
    });
  } catch (error: any) {
    console.error('🔍 Google Places Autocomplete error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch places' });
  }
});

// Test Google Geocoding API (for place details)
router.post('/geocode', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { place_id } = req.body;
    if (!place_id) {
      return res.status(400).json({ message: 'place_id required' });
    }

    console.log('📍 Test Google Geocoding for place_id:', place_id);
    
    const client = new Client({});
    const response = await client.placeDetails({
      params: {
        place_id,
        key: process.env.GOOGLE_MAPS_SERVER_API_KEY!,
        fields: ['geometry', 'formatted_address', 'name'],
      },
    });

    const { geometry, formatted_address, name } = response.data.result;
    if (!geometry) {
      return res.status(404).json({ message: 'Place geometry not found' });
    }
    
    console.log('📍 Google Geocoding result:', {
      name,
      formatted_address,
      location: geometry.location,
    });

    res.json({
      success: true,
      data: {
        lat: geometry.location.lat,
        lng: geometry.location.lng,
        address: formatted_address,
        name,
      },
    });
  } catch (error: any) {
    console.error('📍 Google Geocoding error:', error);
    res.status(500).json({ message: error.message || 'Failed to geocode place' });
  }
});

// Test Google Roads API (for snapping GPS points to road)
router.post('/snap-to-road', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { path } = req.body;
    if (!path || !Array.isArray(path) || path.length === 0) {
      return res.status(400).json({ message: 'path array of lat,lng coordinates required' });
    }

    console.log('🛣️ Test Google Roads API for', path.length, 'GPS points');
    
    const client = new Client({});
    const response = await client.snapToRoads({
      params: {
        path: path.map(point => `${point.lat},${point.lng}`),
        key: process.env.GOOGLE_MAPS_SERVER_API_KEY!,
        interpolate: true,
      },
    });

    console.log('🛣️ Google Roads API result:', {
      originalPoints: path.length,
      snappedPoints: response.data.snappedPoints.length,
    });

    res.json({
      success: true,
      data: {
        snappedPoints: response.data.snappedPoints,
      },
    });
  } catch (error: any) {
    console.error('🛣️ Google Roads API error:', error);
    res.status(500).json({ message: error.message || 'Failed to snap to road' });
  }
});

// Test Google Distance Matrix API (for dynamic ETA with traffic)
router.post('/distance-matrix', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { origins, destinations, departure_time } = req.body;
    if (!origins || !destinations) {
      return res.status(400).json({ message: 'origins and destinations arrays required' });
    }

    console.log('🕐 Test Google Distance Matrix API:', {
      origins: origins.length,
      destinations: destinations.length,
      departure_time: departure_time ? 'now' : 'default',
    });
    
    const client = new Client({});
    const params: any = {
      key: process.env.GOOGLE_MAPS_SERVER_API_KEY!,
      origins: origins.map((o: any) => `${o.lat},${o.lng}`).join('|'),
      destinations: destinations.map((d: any) => `${d.lat},${d.lng}`).join('|'),
    };

    // Add departure time for traffic-aware results
    if (departure_time === 'now') {
      params.departure_time = 'now';
    }

    const response = await client.distancematrix({
      params,
    });

    console.log('🕐 Google Distance Matrix result:', {
      rows: response.data.rows.length,
      status: response.data.status,
    });

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error: any) {
    console.error('🕐 Google Distance Matrix error:', error);
    res.status(500).json({ message: error.message || 'Failed to calculate distance matrix' });
  }
});

// TEMPORARY: Complete driver's active mission (for testing only)
router.post('/complete-driver-mission', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    
    console.log('🔧 Completing active mission for driver:', userId);
    
    // Find any active missions for this driver
    const activeMissions = await Mission.find({
      driver: userId,
      status: { $in: ['accepted', 'in_progress'] }
    });
    
    console.log(`🔧 Found ${activeMissions.length} active missions for driver ${userId}`);
    
    for (const mission of activeMissions) {
      // Mark as completed
      mission.status = 'completed';
      mission.completedAt = new Date();
      await mission.save();
      
      console.log(`🔧 Completed mission ${mission._id} for driver ${userId}`);
    }
    
    res.json({
      success: true,
      message: `Completed ${activeMissions.length} active missions`,
      completedMissions: activeMissions.length
    });
  } catch (error: any) {
    console.error('🔧 Error completing driver mission:', error);
    res.status(500).json({ message: error.message || 'Failed to complete mission' });
  }
});

export default router;
