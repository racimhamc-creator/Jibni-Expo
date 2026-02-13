import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { RideMatchingService } from '../services/rideMatching.service.js';

const router = Router();

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

// Get ride by ID
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

export default router;
