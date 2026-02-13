import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';
import { OTP } from '../models/OTP.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOTP = async (phoneNumber: string): Promise<{
  requiresOTP: boolean;
  user?: any;
  token?: string;
  refreshToken?: string;
}> => {
  // Clean phone number (remove spaces, dashes, parentheses, plus signs)
  // Keep leading zeros (important for Algerian numbers like 0655854120)
  const cleanedPhone = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
  
  // Check if user already exists and is verified
  const existingUser = await User.findOne({ phoneNumber: cleanedPhone });
  
  if (existingUser && existingUser.isVerified) {
    // User exists and is verified - authenticate directly
    const profile = await Profile.findOne({ userId: existingUser._id });
    
    // Generate tokens
    const token = jwt.sign(
      { userId: existingUser._id.toString(), role: existingUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { userId: existingUser._id.toString() },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ User ${cleanedPhone} already verified - authenticating directly`);
    
    return {
      requiresOTP: false,
      user: {
        ...existingUser.toObject(),
        profile: profile?.toObject() || {},
      },
      token,
      refreshToken,
    };
  }
  
  // User doesn't exist or not verified - send OTP
  // For development: Generate fake OTP (any 6 digits)
  // In production, integrate with Twilio/AWS SNS
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Delete old OTPs for this phone number
  await OTP.deleteMany({ phoneNumber: cleanedPhone });

  await OTP.create({
    phoneNumber: cleanedPhone,
    code,
    expiresAt,
  });

  // In development, log OTP to console (remove in production)
  console.log(`🔐 OTP for ${cleanedPhone}: ${code} (expires in 10 minutes)`);
  console.log(`⚠️  Development mode: Any 6-digit code will work for this phone number`);
  
  return {
    requiresOTP: true,
  };
};

export const verifyOTP = async (phoneNumber: string, code: string): Promise<{
  user: any;
  token: string;
  refreshToken: string;
}> => {
  // Clean phone number (remove spaces, dashes, parentheses)
  const cleanedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // For development: Accept any 6-digit code
  // In production, verify against stored OTP
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    // Check if code is 6 digits
    if (!/^\d{6}$/.test(code)) {
      throw new Error('OTP must be 6 digits');
    }
    
    // Check if there's a valid OTP request for this phone number
    const otpRequest = await OTP.findOne({
      phoneNumber: cleanedPhone,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRequest) {
      throw new Error('No OTP request found. Please request a new OTP.');
    }

    // Mark as verified (accept any 6-digit code in dev mode)
    otpRequest.verified = true;
    await otpRequest.save();
    console.log(`✅ Development mode: OTP verified for ${cleanedPhone}`);
  } else {
    // Production: Verify exact code match
    const otp = await OTP.findOne({
      phoneNumber: cleanedPhone,
      code,
      verified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otp) {
      throw new Error('Invalid or expired OTP');
    }

    otp.verified = true;
    await otp.save();
  }

  // Find or create user (use cleaned phone number)
  let user = await User.findOne({ phoneNumber: cleanedPhone });
  if (!user) {
    user = await User.create({
      phoneNumber: cleanedPhone,
      role: 'client',
      isVerified: true,
    });
  } else {
    user.isVerified = true;
    await user.save();
  }

  // Find or create profile (firstName and lastName are optional)
  let profile = await Profile.findOne({ userId: user._id });
  if (!profile) {
    profile = await Profile.create({
      userId: user._id,
      firstName: '', // Optional - user can set later
      lastName: '', // Optional - user can set later
      role: user.role,
    });
  }

  // Generate tokens
  const token = jwt.sign(
    { userId: user._id.toString(), role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  const refreshToken = jwt.sign(
    { userId: user._id.toString() },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return {
    user: {
      ...user.toObject(),
      profile: profile.toObject(),
    },
    token,
    refreshToken,
  };
};

export const refreshAccessToken = async (refreshToken: string): Promise<{
  token: string;
  refreshToken: string;
}> => {
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new Error('User not found');
    }

    const newToken = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const newRefreshToken = jwt.sign(
      { userId: user._id.toString() },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token: newToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};
