import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';
import { Report } from '../models/Report.js';

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
    const userData = user.toObject() as any;
    const profileData = (profile?.toObject() || {}) as any;

    res.json({
      _id: userData._id,
      phoneNumber: userData.phoneNumber,
      role: userData.role,
      isVerified: userData.isVerified,
      isDriverRequested: userData.isDriverRequested,
      banned: profileData.banned || false,
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
    const { firstName, lastName, phoneNumber, email, avatar, city, wilaya, language } = req.body;

    // Update profile
    const profile = await Profile.findOneAndUpdate(
      { userId },
      {
        firstName: firstName !== undefined ? firstName : undefined,
        lastName: lastName !== undefined ? lastName : undefined,
        email: email !== undefined ? email : undefined,
        avatar: avatar !== undefined ? avatar : undefined,
        city: city !== undefined ? city : wilaya !== undefined ? wilaya : undefined,
        language: language !== undefined ? language : undefined, // ✅ FIXED: Add language support
      },
      { new: true, runValidators: true, upsert: true }
    );

    // Update user phone number and language if provided
    if (phoneNumber || language) {
      const user = await User.findById(userId);
      if (user) {
        if (phoneNumber && phoneNumber !== user.phoneNumber) {
          // Check if phone number is already taken
          const existingUser = await User.findOne({ phoneNumber });
          if (existingUser && existingUser._id.toString() !== userId) {
            res.status(400).json({ message: 'Phone number already in use' });
            return;
          }
          user.phoneNumber = phoneNumber;
        }
        
        // ✅ FIXED: Update user language if provided
        if (language !== undefined) {
          user.language = language;
          console.log(`🌍 Updated user ${userId} language to: ${language}`);
        }
        
        await user.save();
      }
    }

    // Get updated user data
    const user = await User.findById(userId);
    const userData = user?.toObject() as any || {};
    const profileData = (profile?.toObject() || {}) as any;

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

    console.log(`💾 Saving FCM token for user ${userId}:`, token.substring(0, 30) + '...');

    const updatedProfile = await Profile.findOneAndUpdate(
      { userId },
      { fcmToken: token },
      { upsert: true, new: true }
    );
    
    console.log(`✅ FCM token saved for user ${userId}:`, {
      profileId: updatedProfile?._id,
      hasToken: !!updatedProfile?.fcmToken
    });

    res.json({ message: 'FCM token updated', success: true });
  } catch (error) {
    console.error('❌ Error saving FCM token:', error);
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to update FCM token' });
  }
});

// Test push notification
router.post('/test-notification', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    
    console.log(`📱 Test notification requested for user ${userId}`);
    
    const { sendNotificationToUser } = await import('../services/notification.service.js');
    
    const result = await sendNotificationToUser(
      userId as string,
      '🔔 Test Notification',
      'This is a test push notification from Jibni server!',
      { type: 'test', screen: 'home' }
    );
    
    if (result) {
      console.log(`✅ Test notification sent successfully to user ${userId}`);
      res.json({ message: 'Test notification sent', success: true });
    } else {
      console.log(`❌ Failed to send test notification to user ${userId}`);
      res.status(400).json({ message: 'Failed to send notification - check FCM token' });
    }
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to send test notification' });
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
    user.driverRequestStatus = 'pending';
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

// Create a report
router.post('/report', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { reportedId, rideId, type, reason, description } = req.body;
    
    if (!reportedId || !reason) {
      res.status(400).json({
        status: 'error',
        message: 'Reported user ID and reason are required',
      });
      return;
    }
    
    // Check if reported user exists
    const reportedUser = await User.findById(reportedId);
    if (!reportedUser) {
      res.status(404).json({
        status: 'error',
        message: 'Reported user not found',
      });
      return;
    }
    
    // Don't allow reporting yourself
    if (reportedId === userId) {
      res.status(400).json({
        status: 'error',
        message: 'You cannot report yourself',
      });
      return;
    }
    
    // Determine severity based on reason
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    if (reason.toLowerCase().includes('violence') || reason.toLowerCase().includes('harassment')) {
      severity = 'critical';
    } else if (reason.toLowerCase().includes('rude') || reason.toLowerCase().includes('behavior')) {
      severity = 'high';
    }
    
    const report = await Report.create({
      reporterId: userId,
      reportedId: reportedId,
      rideId: rideId || undefined, // Store as string (rideId like "RIDE-XXX")
      type: type || 'user',
      reason,
      description,
      severity,
      status: 'pending',
      reviewed: false,
    });
    
    res.status(201).json({
      status: 'success',
      message: 'Report submitted successfully',
      data: {
        reportId: report.reportId,
        id: report._id,
      },
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to submit report' 
    });
  }
});

export default router;
