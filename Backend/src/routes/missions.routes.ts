import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';
import {
  requestMission,
  acceptMission,
  rejectMission,
  completeMission,
  cancelMission,
  getActiveMission,
  getMissionHistory,
} from '../controllers/mission.controller.js';
import { Mission } from '../models/Mission.js';
import { Ride } from '../models/Ride.js';
import { Profile } from '../models/Profile.js';

const router = Router();

router.use(authenticate);

router.post('/request', requestMission);
router.post('/:id/accept', acceptMission);
router.post('/:id/reject', rejectMission);
router.post('/:id/complete', completeMission);
router.post('/:id/cancel', cancelMission);
router.get('/active', getActiveMission);
router.get('/history', getMissionHistory);

// Rate a driver after mission completion
router.post('/:missionId/rate', async (req: AuthRequest, res: Response) => {
  try {
    const { missionId } = req.params;
    const { rating, comment } = req.body;
    const clientId = req.userId;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Rating must be between 1 and 5'
      });
    }

    // First try to find in Ride collection (new system)
    let ride = await Ride.findOne({ rideId: missionId });
    
    // If not found in Ride, try Mission collection (legacy)
    let mission;
    if (!ride) {
      if (missionId.match(/^[0-9a-fA-F]{24}$/)) {
        // Looks like MongoDB ObjectId, try both
        mission = await Mission.findOne({ 
          $or: [{ _id: missionId }, { missionId }] 
        });
      } else {
        // Is a missionId string like "RIDE-XXX"
        mission = await Mission.findOne({ missionId });
      }
    }

    const target = ride || mission;
    
    if (!target) {
      return res.status(404).json({
        status: 'error',
        message: 'Mission not found'
      });
    }

    // Verify the client is the one who requested the ride/mission
    if (target.clientId?.toString() !== clientId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only rate missions you requested'
      });
    }

    // Verify ride/mission is completed
    if (target.status !== 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Can only rate completed missions'
      });
    }

    // Update ride/mission with rating
    target.rating = rating;
    target.comment = comment;
    await target.save();

    // Update driver's profile rating
    if (target.driverId) {
      const driverProfile = await Profile.findOne({ userId: target.driverId });
      if (driverProfile) {
        const currentTotal = (driverProfile.rating || 0) * (driverProfile.totalRatings || 0);
        const newTotalRatings = (driverProfile.totalRatings || 0) + 1;
        const newRating = (currentTotal + rating) / newTotalRatings;
        
        driverProfile.rating = Math.round(newRating * 10) / 10; // Round to 1 decimal
        driverProfile.totalRatings = newTotalRatings;
        await driverProfile.save();
      }
    }

    res.json({
      status: 'success',
      message: 'Rating submitted successfully',
      data: {
        missionId: ride ? ride.rideId : mission?.missionId,
        rating,
        comment
      }
    });
  } catch (error: any) {
    console.error('Error submitting rating:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to submit rating'
    });
  }
});

// Get driver's rating info
router.get('/driver/:driverId/rating', async (req: AuthRequest, res: Response) => {
  try {
    const { driverId } = req.params;

    const driverProfile = await Profile.findOne({ userId: driverId });
    if (!driverProfile) {
      return res.status(404).json({
        status: 'error',
        message: 'Driver not found'
      });
    }

    // Get all ratings for this driver
    const ratings = await Mission.find({
      driverId,
      rating: { $exists: true, $ne: null }
    }).select('rating comment createdAt clientId').sort({ createdAt: -1 });

    res.json({
      status: 'success',
      data: {
        averageRating: driverProfile.rating || 0,
        totalRatings: driverProfile.totalRatings || 0,
        ratings: ratings.map(r => ({
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt
        }))
      }
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch driver rating'
    });
  }
});

export default router;
