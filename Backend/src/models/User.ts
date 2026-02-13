import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  phoneNumber: string;
  role: 'client' | 'driver';
  isVerified: boolean;
  isDriverRequested: boolean; // Client requested to become a driver
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
      enum: ['client', 'driver'],
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
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
