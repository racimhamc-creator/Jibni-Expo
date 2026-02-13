import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';

const router = Router();

router.use(authenticate);

router.get('/me', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    const profile = await Profile.findOne({ userId });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Combine user and profile data
    const userData = user.toObject();
    const profileData = profile?.toObject() || {};

    res.json({
      _id: userData._id,
      phoneNumber: userData.phoneNumber,
      role: userData.role,
      isVerified: userData.isVerified,
      isDriverRequested: userData.isDriverRequested,
      firstName: profileData.firstName || '',
      lastName: profileData.lastName || '',
      email: profileData.email,
      avatar: profileData.avatar,
      city: profileData.city,
      wilaya: profileData.city, // Map city to wilaya for frontend
      vehicleType: profileData.vehicleType,
      rating: profileData.rating || 0,
      totalRatings: profileData.totalRatings || 0,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to get user' });
  }
});

router.put('/me', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { firstName, lastName, phoneNumber, email, avatar, city, wilaya } = req.body;

    // Update profile
    const profile = await Profile.findOneAndUpdate(
      { userId },
      {
        firstName: firstName !== undefined ? firstName : undefined,
        lastName: lastName !== undefined ? lastName : undefined,
        email: email !== undefined ? email : undefined,
        avatar: avatar !== undefined ? avatar : undefined,
        city: city !== undefined ? city : wilaya !== undefined ? wilaya : undefined,
      },
      { new: true, runValidators: true, upsert: true }
    );

    // Update user phone number if provided
    if (phoneNumber) {
      const user = await User.findById(userId);
      if (user && phoneNumber !== user.phoneNumber) {
        // Check if phone number is already taken
        const existingUser = await User.findOne({ phoneNumber });
        if (existingUser && existingUser._id.toString() !== userId) {
          res.status(400).json({ message: 'Phone number already in use' });
          return;
        }
        user.phoneNumber = phoneNumber;
        await user.save();
      }
    }

    // Get updated user data
    const user = await User.findById(userId);
    const userData = user?.toObject() || {};
    const profileData = profile?.toObject() || {};

    res.json({
      _id: userData._id,
      phoneNumber: userData.phoneNumber,
      role: userData.role,
      isVerified: userData.isVerified,
      isDriverRequested: userData.isDriverRequested,
      firstName: profileData.firstName || '',
      lastName: profileData.lastName || '',
      email: profileData.email,
      avatar: profileData.avatar,
      city: profileData.city,
      wilaya: profileData.city,
      vehicleType: profileData.vehicleType,
      rating: profileData.rating || 0,
      totalRatings: profileData.totalRatings || 0,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to update profile' });
  }
});

router.post('/fcm-token', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ message: 'FCM token is required' });
      return;
    }

    await Profile.findOneAndUpdate(
      { userId },
      { fcmToken: token }
    );

    res.json({ message: 'FCM token updated' });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to update FCM token' });
  }
});

// Request to become a driver
router.post('/request-driver', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { firstName, lastName, wilaya, city, drivingLicense, grayCard } = req.body;
    
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

    if (user.isDriverRequested) {
      res.status(400).json({ 
        status: 'error',
        message: 'Driver request already submitted' 
      });
      return;
    }

    // Update user
    user.isDriverRequested = true;
    await user.save();

    // Update or create profile with driver registration data
    const profile = await Profile.findOne({ userId });
    if (profile) {
      if (firstName) profile.firstName = firstName;
      if (lastName) profile.lastName = lastName;
      if (wilaya || city) profile.city = wilaya || city;
      if (drivingLicense) {
        profile.drivingLicense = {
          url: drivingLicense.url || drivingLicense,
          number: drivingLicense.number || '',
          expiryDate: drivingLicense.expiryDate || new Date(),
        };
      }
      if (grayCard) {
        profile.vehicleCard = {
          url: grayCard.url || grayCard,
          number: grayCard.number || '',
        };
      }
      await profile.save();
    } else {
      // Create new profile
      await Profile.create({
        userId,
        firstName: firstName || '',
        lastName: lastName || '',
        city: wilaya || city || '',
        role: 'client',
        drivingLicense: drivingLicense ? {
          url: drivingLicense.url || drivingLicense,
          number: drivingLicense.number || '',
          expiryDate: drivingLicense.expiryDate || new Date(),
        } : undefined,
        vehicleCard: grayCard ? {
          url: grayCard.url || grayCard,
          number: grayCard.number || '',
        } : undefined,
      });
    }

    res.json({ 
      status: 'success',
      message: 'Driver request submitted successfully',
      isDriverRequested: true 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to submit driver request' 
    });
  }
});

export default router;
