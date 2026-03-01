import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  sendOTPController,
  verifyOTPController,
  refreshTokenController,
  logoutController,
} from '../controllers/auth.controller.js';
import { User } from '../models/User.js';

const router = Router();

router.post('/send-otp', sendOTPController);
router.post('/verify-otp', verifyOTPController);
router.post('/refresh-token', refreshTokenController);
router.post('/logout', logoutController);

// Admin login with password (JWT Cookie)
router.post('/admin-login', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number and password are required'
      });
    }

    // Find user with password
    const user = await User.findOne({ phoneNumber }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Verify password
    if (!user.password) {
      return res.status(401).json({
        status: 'error',
        message: 'Password not set. Please contact system administrator.'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Generate JWT (use same secret as OTP auth for consistency)
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      JWT_SECRET,
      { expiresIn: '9999y' }
    );

    // Set HTTP-only cookie
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed from 'strict' to allow cross-origin in dev
      maxAge: 9999 * 365 * 24 * 60 * 60 * 1000, // essentially forever
    });

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          phoneNumber: user.phoneNumber,
          role: user.role,
        },
        token, // Also return token for clients that need it (e.g., cross-origin)
      }
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Login failed'
    });
  }
});

// Admin logout - clear cookie
router.post('/admin-logout', (req: Request, res: Response) => {
  res.clearCookie('admin_token');
  res.json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

export default router;
