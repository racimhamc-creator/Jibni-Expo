import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Profile } from '../models/Profile.js';
import { OTP } from '../models/OTP.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';

export const generateOTP = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
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
      { expiresIn: '9999y' }
    );

    const refreshToken = jwt.sign(
      { userId: existingUser._id.toString() },
      JWT_REFRESH_SECRET,
      { expiresIn: '9999y' }
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
  // For development: Generate fake OTP (any 4 digits)
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
  console.log(`⚠️  Any 4-digit code will work for this phone number`);
  
  return {
    requiresOTP: true,
  };
};

export const verifyOTP = async (phoneNumber: string, code: string): Promise<{
  user: any;
  token: string;
  refreshToken: string;
}> => {
  // Clean phone number (remove spaces, dashes, parentheses, plus signs)
  const cleanedPhone = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
  
  // For development/testing: Accept any 4-digit code
  // In production, verify against stored OTP
  const allowFakeOTP = true; // Force fake OTP for testing
  
  if (allowFakeOTP) {
    // Check if code is 4 digits
    if (!/^\d{4}$/.test(code)) {
      throw new Error('OTP must be 4 digits');
    }
    
    // In development/testing mode: Accept any 4-digit code
    // Check if there's an OTP request (even if expired, we'll still allow it in dev mode)
    let otpRequest = await OTP.findOne({
      phoneNumber: cleanedPhone,
    }).sort({ createdAt: -1 }); // Get the most recent OTP request

    // If no OTP request exists, create one automatically for testing
    if (!otpRequest) {
      console.log(`⚠️  No OTP request found for ${cleanedPhone}, creating one automatically (dev mode)`);
      otpRequest = await OTP.create({
        phoneNumber: cleanedPhone,
        code: code, // Use the provided code
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        verified: false,
      });
    }

    // Mark as verified (accept any 4-digit code in dev/test mode)
    otpRequest.verified = true;
    await otpRequest.save();
    console.log(`✅ OTP verified for ${cleanedPhone} (any 4-digit code accepted)`);
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
  
  // Check if this phone number should be admin (for testing)
  // You can set ADMIN_PHONE_NUMBERS env var with comma-separated phone numbers
  const adminPhoneNumbers = process.env.ADMIN_PHONE_NUMBERS?.split(',').map(p => p.trim()) || [];
  const shouldBeAdmin = adminPhoneNumbers.includes(cleanedPhone);
  
  if (!user) {
    // Create new user - check if should be admin
    const userRole = shouldBeAdmin ? 'admin' : 'client';
    user = await User.create({
      phoneNumber: cleanedPhone,
      role: userRole,
      isVerified: true,
    });
    console.log(`✅ New user created: ${cleanedPhone} with role: ${userRole}`);
  } else {
    // Existing user - update verification status
    user.isVerified = true;
    
    // If user should be admin and isn't, update role (for testing)
    if (shouldBeAdmin && user.role !== 'admin') {
      console.log(`⚠️  Updating user ${cleanedPhone} to admin role (testing mode)`);
      user.role = 'admin';
    }
    
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

  // Generate tokens with proper role
  // Ensure role is set (default to 'client' if not set)
  const userRole = user.role || 'client';
  
  // Use the same JWT_SECRET as admin-login for consistency
  const token = jwt.sign(
    { userId: user._id.toString(), role: userRole },
    JWT_SECRET,
    { expiresIn: '9999y' }
  );

  const refreshToken = jwt.sign(
    { userId: user._id.toString() },
    JWT_REFRESH_SECRET,
    { expiresIn: '9999y' }
  );

  console.log(`🔑 Token generated for user ${cleanedPhone}:`, {
    userId: user._id.toString(),
    role: userRole,
    tokenLength: token.length,
    expiresIn: '9999y',
    isAdmin: userRole === 'admin'
  });

  return {
    user: {
      ...user.toObject(),
      profile: profile.toObject(),
      role: userRole, // Ensure role is included in user object
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
      { expiresIn: '9999y' }
    );

    const newRefreshToken = jwt.sign(
      { userId: user._id.toString() },
      JWT_REFRESH_SECRET,
      { expiresIn: '9999y' }
    );

    return {
      token: newToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};
