// Backend User Model with Language Support
// This would be implemented in your Node.js/Express backend

import mongoose, { Schema, Document } from 'mongoose';

// User interface with language field
export interface IUser extends Document {
  phoneNumber: string;
  role: 'client' | 'driver' | 'admin';
  isVerified: boolean;
  isDriverRequested: boolean;
  banned: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  city?: string;
  wilaya?: string;
  vehicleType?: string;
  rating?: number;
  totalRatings?: number;
  language: 'en' | 'fr' | 'ar'; // Language preference for notifications
  fcmToken?: string; // FCM token for push notifications
  profile?: {
    banned?: boolean;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string;
    city?: string;
    wilaya?: string;
    vehicleType?: string;
    rating?: number;
    totalRatings?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// User schema with language field
const userSchema = new Schema<IUser>({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['client', 'driver', 'admin'],
    default: 'client'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isDriverRequested: {
    type: Boolean,
    default: false
  },
  banned: {
    type: Boolean,
    default: false
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  avatar: {
    type: String
  },
  city: {
    type: String,
    trim: true
  },
  wilaya: {
    type: String,
    trim: true
  },
  vehicleType: {
    type: String,
    enum: ['moto', 'car', 'truck', 'van']
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalRatings: {
    type: Number,
    min: 0,
    default: 0
  },
  // Language preference for push notifications
  language: {
    type: String,
    enum: ['en', 'fr', 'ar'],
    default: 'en',
    required: true
  },
  // FCM token for push notifications
  fcmToken: {
    type: String,
    trim: true
  },
  // Embedded profile for backward compatibility
  profile: {
    banned: {
      type: Boolean,
      default: false
    },
    firstName: {
      type: String,
      trim: top
    },
    lastName: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    avatar: {
      type: String
    },
    city: {
      type: String,
      trim: true
    },
    wilaya: {
      type: String,
      trim: true
    },
    vehicleType: {
      type: String,
      enum: ['moto', 'car', 'truck', 'van']
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    totalRatings: {
      type: Number,
      min: 0,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Ensure language field is always present in JSON output
      ret.language = ret.language || 'en';
      return ret;
    }
  }
});

// Indexes for better performance
userSchema.index({ phoneNumber: 1 });
userSchema.index({ role: 1 });
userSchema.index({ language: 1 });
userSchema.index({ fcmToken: 1 });

// Middleware to sync language between main field and profile
userSchema.pre('save', function(next) {
  if (this.isModified('language') && this.profile) {
    // You could store language in profile if needed for compatibility
    // this.profile.language = this.language;
  }
  next();
});

// Static method to find users by language
userSchema.statics.findByLanguage = function(language: string) {
  return this.find({ language: language });
};

// Static method to find users with FCM tokens
userSchema.statics.findWithFCMTokens = function() {
  return this.find({ fcmToken: { $exists: true, $ne: '' } });
};

// Instance method to get user's language with fallback
userSchema.methods.getLanguage = function(): string {
  return this.language || 'en';
};

// Instance method to check if user has valid FCM token
userSchema.methods.hasValidFCMToken = function(): boolean {
  return !!(this.fcmToken && this.fcmToken.length > 0);
};

// Create and export the model
export const User = mongoose.model<IUser>('User', userSchema);

// Helper function to create user with language preference
export async function createUserWithLanguage(userData: Partial<IUser>, language: 'en' | 'fr' | 'ar' = 'en'): Promise<IUser> {
  const user = new User({
    ...userData,
    language,
    // Ensure profile is also set if provided
    profile: userData.profile ? {
      ...userData.profile,
    } : undefined
  });
  
  return await user.save();
}

// Helper function to update user language
export async function updateUserLanguage(userId: string, language: 'en' | 'fr' | 'ar'): Promise<IUser | null> {
  return await User.findByIdAndUpdate(
    userId,
    { language },
    { new: true, runValidators: true }
  );
}

// Helper function to get users for bulk notifications by language
export async function getUsersByLanguageForNotification(language: 'en' | 'fr' | 'ar'): Promise<IUser[]> {
  return await User.find({
    language,
    fcmToken: { $exists: true, $ne: '' },
    banned: false
  }).select('_id phoneNumber language fcmToken role');
}
