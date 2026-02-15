import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  phoneNumber: string;
  role: 'client' | 'driver' | 'admin';
  isVerified: boolean;
  isDriverRequested: boolean; // Client requested to become a driver
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
