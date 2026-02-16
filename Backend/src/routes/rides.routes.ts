import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';
import { RideMatchingService } from '../services/rideMatching.service.js';
import { calculateComprehensivePricing, getDistanceDuration } from '../services/pricing.service.js';

const router = Router();

// POST /api/rides/estimate-price - Get price estimate before requesting ride
router.post('/estimate-price', authenticate, async (req: AuthRequest, res) => {
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
router.get('/active', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { Ride } = await import('../models/Ride.js');
    
    const ride = await Ride.findOne({
      $or: [{ clientId: userId }, { driverId: userId }],
      status: { $in: ['accepted', 'driver_arrived', 'in_progress'] }
    });
    
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

// Get ride history
router.get('/history', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { Ride } = await import('../models/Ride.js');
    
    const rides = await Ride.find({
      $or: [{ clientId: userId }, { driverId: userId }],
      status: { $in: ['completed', 'cancelled'] }
    }).sort({ createdAt: -1 }).limit(50);
    
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

// Get completed rides for current user
router.get('/completed', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { Ride } = await import('../models/Ride.js');
    
    const rides = await Ride.find({
      $or: [{ clientId: userId }, { driverId: userId }],
      status: 'completed'
    }).sort({ completedAt: -1 });
    
    res.json({
      success: true,
      data: rides,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get completed rides',
    });
  }
});

// Get specific ride by ID
router.get('/:rideId', authenticate, async (req: AuthRequest, res) => {
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
