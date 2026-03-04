import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  phoneNumber: string;
  password?: string; // For admin users
  role: 'client' | 'driver' | 'admin';
  isVerified: boolean;
  isDriverRequested: boolean; // Client requested to become a driver
  driverRequestStatus: 'none' | 'pending' | 'approved' | 'rejected'; // Track request status
  driverRequestReason?: string; // Rejection reason
  isBanned: boolean;
  banReason?: string;
  bannedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      select: false, // Don't include by default in queries
    },
    role: {
      type: String,
      enum: ['client', 'driver', 'admin'],
      default: 'client',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isDriverRequested: {
      type: Boolean,
      default: false,
    },
    driverRequestStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
    driverRequestReason: {
      type: String,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
    },
    bannedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
