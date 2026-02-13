import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';
import { Mission } from '../models/Mission.js';
import { sendDriverApprovalNotification, sendDriverRejectionNotification } from '../services/notification.service.js';

const router = Router();

// Admin routes - require authentication
// TODO: Add admin role check middleware
// For now, we'll make it optional for development - you can add authentication later
// router.use(authenticate);

// Get all users with their profiles
router.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    const profiles = await Profile.find();
    
    // Combine users with their profiles
    const usersWithProfiles = users.map(user => {
      const profile = profiles.find(p => p.userId.toString() === user._id.toString());
      const userMissions = []; // TODO: Count missions when Mission model is ready
      
      return {
        _id: user._id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVerified: user.isVerified,
        isDriverRequested: user.isDriverRequested,
        firstName: profile?.firstName || '',
        lastName: profile?.lastName || '',
        email: profile?.email,
        avatar: profile?.avatar,
        city: profile?.city || '',
        wilaya: profile?.city || '',
        vehicleType: profile?.vehicleType,
        rating: profile?.rating || 0,
        totalRatings: profile?.totalRatings || 0,
        openToWork: profile?.openToWork || false,
        engaged: profile?.engaged || false,
        banned: profile?.banned || false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        hasMissions: userMissions.length > 0,
      };
    });

    res.json({
      status: 'success',
      data: usersWithProfiles,
      total: usersWithProfiles.length,
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch users' 
    });
  }
});

// Get all driver requests (users with isDriverRequested = true)
router.get('/driver-requests', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find({ 
      isDriverRequested: true,
      role: 'client' // Only clients who requested to be drivers
    }).sort({ updatedAt: -1 });
    
    const profiles = await Profile.find({
      userId: { $in: users.map(u => u._id) }
    });

    const requests = users.map(user => {
      const profile = profiles.find(p => p.userId.toString() === user._id.toString());
      
      return {
        _id: user._id,
        userId: user._id,
        phoneNumber: user.phoneNumber,
        submittedAt: user.updatedAt, // When they requested
        reviewed: user.role === 'driver', // If role changed to driver, it's reviewed
        approved: user.role === 'driver', // Approved if role is driver
        rejectionReason: null, // TODO: Add rejection reason field to User model
        profile: {
          firstName: profile?.firstName || '',
          lastName: profile?.lastName || '',
          name: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'No Name',
          phoneNumber: user.phoneNumber,
          city: profile?.city || '',
          wilaya: profile?.city || '',
          role: user.role,
          drivingLicense: profile?.drivingLicense?.url || null,
          grayCard: profile?.vehicleCard?.url || null,
          licenceId: profile?.drivingLicense?.number || null,
          grayCardId: profile?.vehicleCard?.number || null,
        },
      };
    });

    res.json({
      status: 'success',
      data: requests,
      total: requests.length,
      pending: requests.filter(r => !r.reviewed).length,
      approved: requests.filter(r => r.approved).length,
      rejected: requests.filter(r => r.reviewed && !r.approved).length,
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch driver requests' 
    });
  }
});

// Approve driver request
router.post('/driver-requests/:userId/approve', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { licenceId, grayCardId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
      return;
    }

    if (user.role === 'driver') {
      res.status(400).json({ 
        status: 'error',
        message: 'User is already a driver' 
      });
      return;
    }

    if (!user.isDriverRequested) {
      res.status(400).json({ 
        status: 'error',
        message: 'User has not requested to become a driver' 
      });
      return;
    }

    // Update user role to driver
    user.role = 'driver';
    user.isDriverRequested = false; // Reset request flag
    await user.save();

    // Update profile with license and card IDs if provided
    const profile = await Profile.findOne({ userId });
    if (profile) {
      if (licenceId && profile.drivingLicense) {
        profile.drivingLicense.number = licenceId;
      }
      if (grayCardId && profile.vehicleCard) {
        profile.vehicleCard.number = grayCardId;
      }
      profile.role = 'driver';
      await profile.save();
    }

    // Send push notification to the driver
    try {
      await sendDriverApprovalNotification(userId);
      console.log(`✅ Driver approval notification sent to user ${userId}`);
    } catch (error) {
      console.error('⚠️ Failed to send driver approval notification:', error);
      // Don't fail the request if notification fails
    }

    res.json({
      status: 'success',
      message: 'Driver request approved successfully',
      user: {
        _id: user._id,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to approve driver request' 
    });
  }
});

// Reject driver request
router.post('/driver-requests/:userId/reject', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      res.status(400).json({ 
        status: 'error',
        message: 'Rejection reason is required' 
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
      return;
    }

    if (user.role === 'driver') {
      res.status(400).json({ 
        status: 'error',
        message: 'User is already a driver' 
      });
      return;
    }

    // Reset driver request flag
    user.isDriverRequested = false;
    await user.save();

    // TODO: Store rejection reason in a separate collection or add to User model
    // For now, we'll just reset the flag

    // Send push notification to the user
    try {
      await sendDriverRejectionNotification(userId, rejectionReason);
      console.log(`✅ Driver rejection notification sent to user ${userId}`);
    } catch (error) {
      console.error('⚠️ Failed to send driver rejection notification:', error);
      // Don't fail the request if notification fails
    }

    res.json({
      status: 'success',
      message: 'Driver request rejected successfully',
      rejectionReason,
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to reject driver request' 
    });
  }
});

export default router;
