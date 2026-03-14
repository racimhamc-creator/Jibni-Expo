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

// Get active ride for current user (for ride state restoration)
router.get('/active', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const { Ride } = await import('../models/Ride.js');
    const { Profile } = await import('../models/Profile.js');
    
    const ride = await Ride.findOne({
      $or: [{ clientId: userId }, { driverId: userId }],
      status: { $in: ['searching', 'assigned', 'accepted', 'driver_arrived', 'in_progress'] }
    }).populate('clientId', 'firstName lastName phoneNumber').populate('driverId', 'firstName lastName phoneNumber');
    
    if (!ride) {
      return res.json({
        success: true,
        data: null,
        message: 'No active ride found',
      });
    }
    
    // Cast populated fields properly
    const populatedClient = ride.clientId as any;
    const populatedDriver = ride.driverId as any;
    
    const isClient = populatedClient?._id?.toString() === userId;
    const isDriver = populatedDriver?._id?.toString() === userId;
    
    // Get client location from Profile
    let clientLocation = null;
    if (populatedClient?._id) {
      const clientProfile = await Profile.findOne({ userId: populatedClient._id });
      if (clientProfile?.currentLocation) {
        clientLocation = clientProfile.currentLocation;
      }
    }
    
    // Get driver location from Profile
    let driverLocation = null;
    if (populatedDriver?._id) {
      const driverProfile = await Profile.findOne({ userId: populatedDriver._id });
      if (driverProfile?.currentLocation) {
        driverLocation = driverProfile.currentLocation;
      }
    }
    
    // Format the response
    const responseData = {
      rideId: ride.rideId,
      status: ride.status,
      isClient,
      isDriver,
      pickupLocation: ride.pickupLocation,
      destinationLocation: ride.destinationLocation,
      pricing: ride.pricing,
      eta: ride.eta,
      distance: ride.distance,
      clientId: populatedClient?._id,
      clientName: populatedClient ? `${populatedClient.firstName || ''} ${populatedClient.lastName || ''}`.trim() : null,
      clientPhone: populatedClient?.phoneNumber,
      driverId: populatedDriver?._id,
      driverName: populatedDriver ? `${populatedDriver.firstName || ''} ${populatedDriver.lastName || ''}`.trim() : null,
      driverPhone: populatedDriver?.phoneNumber,
      clientLocation,
      driverLocation,
      createdAt: ride.createdAt,
      acceptedAt: ride.acceptedAt,
      startedAt: ride.startedAt,
    };
    
    res.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('Error getting active ride:', error);
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
