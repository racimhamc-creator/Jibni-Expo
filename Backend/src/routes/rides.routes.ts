import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { RideMatchingService } from '../services/rideMatching.service.js';
import { calculateComprehensivePricing, getDistanceDuration } from '../services/pricing.service.js';

const router = Router();

// POST /api/rides/estimate-price - Get price estimate before requesting ride
router.post('/estimate-price', authenticate, async (req, res) => {
  try {
    const { 
      pickupLat, 
      pickupLng, 
      destLat, 
      destLng,
      // Optional: if client wants to simulate with a specific driver location
      driverLat,
      driverLng 
    } = req.body;

    if (!pickupLat || !pickupLng || !destLat || !destLng) {
      return res.status(400).json({
        success: false,
        message: 'Missing required coordinates (pickupLat, pickupLng, destLat, destLng)',
      });
    }

    // Calculate trip distance
    const tripDistance = await getDistanceDuration(
      pickupLat, pickupLng,
      destLat, destLng
    );

    let pricing;
    let distances;

    if (driverLat && driverLng) {
      // If driver location provided, calculate full pricing
      const pickupDistance = await getDistanceDuration(
        driverLat, driverLng,
        pickupLat, pickupLng
      );
      
      pricing = calculateComprehensivePricing(
        pickupDistance.distance,
        tripDistance.distance,
        new Date()
      );
      
      distances = {
        pickup: pickupDistance.distance,
        trip: tripDistance.distance,
        total: pickupDistance.distance + tripDistance.distance,
      };
    } else {
      // Initial estimate without driver (0 pickup distance)
      pricing = calculateComprehensivePricing(
        0,
        tripDistance.distance,
        new Date()
      );
      
      distances = {
        pickup: 0,
        trip: tripDistance.distance,
        total: tripDistance.distance,
      };
    }

    res.json({
      success: true,
      data: {
        pricing,
        distances: {
          pickup: Math.round(distances.pickup),
          trip: Math.round(distances.trip),
          total: Math.round(distances.total),
        },
        note: driverLat ? 'Final price' : 'Estimate only - final price depends on driver location',
      },
    });
  } catch (error: any) {
    console.error('Price estimation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate price estimate',
    });
  }
});

// Get active ride for current user
router.get('/active', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const role = req.userRole;

    let ride;
    if (role === 'driver') {
      ride = await RideMatchingService.getDriverActiveRide(userId);
    } else {
      ride = await RideMatchingService.getClientActiveRide(userId);
    }

    res.json({
      success: true,
      data: ride,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get active ride',
    });
  }
});

// Get ride history for current user
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const role = req.userRole;
    const { Ride } = await import('../models/Ride.js');

    const query = role === 'driver' 
      ? { driverId: userId }
      : { clientId: userId };

    const rides = await Ride.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('clientId', 'phoneNumber')
      .populate('driverId', 'phoneNumber');

    res.json({
      success: true,
      data: rides,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get ride history',
    });
  }
});

// Get completed rides for driver (for Mission History screen)
// IMPORTANT: This must come BEFORE '/:rideId' route
router.get('/completed', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { Ride } = await import('../models/Ride.js');

    console.log(`📜 Fetching completed rides for driver ${userId}`);

    const rides = await Ride.find({ 
      driverId: userId,
      status: 'completed'
    })
      .sort({ completedAt: -1 })
      .limit(50)
      .select('rideId pickupLocation destinationLocation pricing vehicleType completedAt status');

    console.log(`✅ Found ${rides.length} completed rides`);

    res.json({
      success: true,
      data: rides,
    });
  } catch (error: any) {
    console.error('❌ Error fetching completed rides:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get completed rides',
    });
  }
});

// Get ride by ID - This must come AFTER all specific routes like '/completed', '/history', '/active'
router.get('/:rideId', authenticate, async (req, res) => {
  try {
    const { rideId } = req.params;
    const { Ride } = await import('../models/Ride.js');
    
    const ride = await Ride.findOne({ rideId })
      .populate('clientId', 'phoneNumber')
      .populate('driverId', 'phoneNumber');

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found',
      });
    }

    res.json({
      success: true,
      data: ride,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get ride',
    });
  }
});

export default router;
