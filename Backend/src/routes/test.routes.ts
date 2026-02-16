import { Router, Response } from 'express';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';

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

export default router;
