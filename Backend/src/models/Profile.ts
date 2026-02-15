import mongoose, { Schema, Document } from 'mongoose';

export interface IProfile extends Document {
  userId: mongoose.Types.ObjectId;
  firstName: string; // Optional - defaults to empty string
  lastName: string; // Optional - defaults to empty string
  email?: string;
  avatar?: string;
  role: 'client' | 'driver';
  openToWork: boolean;
  engaged: boolean;
  banned: boolean;
  city?: string;
  drivingLicense?: {
    url: string;
    number: string;
    expiryDate: Date;
  };
  vehicleCard?: {
    url: string;
    number: string;
  };
  vehicleType?: string; // moto, car, truck, van
  rating?: number; // Average rating
  totalRatings?: number; // Total number of ratings
  totalRevenue?: number; // Total earnings
  totalMissions?: number; // Total completed missions
  isOnline?: boolean; // Driver online status
  fcmToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileSchema = new Schema<IProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      default: '',
    },
    lastName: {
      type: String,
      default: '',
    },
    email: {
      type: String,
    },
    avatar: {
      type: String,
    },
    role: {
      type: String,
      enum: ['client', 'driver'],
      required: true,
    },
    openToWork: {
      type: Boolean,
      default: false,
    },
    engaged: {
      type: Boolean,
      default: false,
    },
    banned: {
      type: Boolean,
      default: false,
    },
    city: {
      type: String,
    },
    drivingLicense: {
      url: String,
      number: String,
      expiryDate: Date,
    },
    vehicleCard: {
      url: String,
      number: String,
    },
    vehicleType: {
      type: String,
      enum: ['moto', 'car', 'truck', 'van'],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    totalMissions: {
      type: Number,
      default: 0,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    fcmToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const Profile = mongoose.model<IProfile>('Profile', ProfileSchema);
