import { Request, Response } from 'express';
import { sendOTP, verifyOTP, refreshAccessToken } from '../services/auth.service.js';

export const sendOTPController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      res.status(400).json({ 
        status: 'error',
        message: 'Phone number is required' 
      });
      return;
    }

    // Validate phone number format - very lenient for development
    // Accepts any phone number with at least 8 digits (including those starting with 0)
    // Remove spaces, dashes, parentheses, plus signs for validation
    const cleanedPhone = phoneNumber.replace(/[\s\-\(\)\+]/g, ''); 
    
    // Check if it's all digits and has at least 8 characters
    if (!/^\d{8,}$/.test(cleanedPhone)) {
      res.status(400).json({ 
        status: 'error',
        message: 'Invalid phone number format. Please enter a valid phone number (at least 8 digits)' 
      });
      return;
    }

    // Use cleaned phone number for OTP
    const result = await sendOTP(cleanedPhone);
    
    if (!result.requiresOTP && result.user && result.token && result.refreshToken) {
      // User exists and is verified - return auth tokens directly
      res.json({ 
        status: 'success',
        requiresOTP: false,
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken,
        message: 'User authenticated successfully' 
      });
    } else {
      // OTP sent
      res.json({ 
        status: 'success',
        requiresOTP: true,
        message: 'OTP sent successfully' 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to send OTP' 
    });
  }
};

export const verifyOTPController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, code } = req.body;
    
    if (!phoneNumber || !code) {
      res.status(400).json({ 
        status: 'error',
        message: 'Phone number and code are required' 
      });
      return;
    }

    // Validate code format (must be 6 digits)
    if (!/^\d{6}$/.test(code)) {
      res.status(400).json({ 
        status: 'error',
        message: 'OTP must be 6 digits' 
      });
      return;
    }

    const result = await verifyOTP(phoneNumber, code);
    res.json({
      status: 'success',
      ...result
    });
  } catch (error) {
    res.status(400).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Invalid OTP' 
    });
  }
};

export const refreshTokenController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      res.status(400).json({ message: 'Refresh token is required' });
      return;
    }

    const tokens = await refreshAccessToken(refreshToken);
    res.json(tokens);
  } catch (error) {
    res.status(401).json({ message: error instanceof Error ? error.message : 'Invalid refresh token' });
  }
};

export const logoutController = async (req: Request, res: Response): Promise<void> => {
  // In a more advanced implementation, you might want to blacklist the token
  res.json({ message: 'Logged out successfully' });
};
