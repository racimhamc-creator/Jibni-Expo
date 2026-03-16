// Backend Ride Model
// This model represents a ride/mission in the system

import mongoose, { Schema, Document } from 'mongoose';

export interface IRide extends Document {
  rideId: string;
  status: 'pending' | 'accepted' | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled';
  clientId: string;
  driverId?: string;
  pickupLocation: {
    lat: number;
    lng: number;
    address?: string;
  };
  destinationLocation: {
    lat: number;
    lng: number;
    address?: string;
  };
  pricing?: {
    basePrice: number;
    distancePrice: number;
    totalPrice: number;
  };
  distance?: number;
  eta?: number;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date;
  arrivedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
}

const rideSchema = new Schema<IRide>({
  rideId: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'driver_arrived', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
  },
  clientId: {
    type: String,
    required: true,
    index: true,
  },
  driverId: {
    type: String,
    index: true,
  },
  pickupLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: String,
  },
  destinationLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: String,
  },
  pricing: {
    basePrice: Number,
    distancePrice: Number,
    totalPrice: Number,
  },
  distance: Number,
  eta: Number,
  acceptedAt: Date,
  arrivedAt: Date,
  startedAt: Date,
  completedAt: Date,
}, {
  timestamps: true,
});

// Indexes for common queries
rideSchema.index({ status: 1 });
rideSchema.index({ clientId: 1, status: 1 });
rideSchema.index({ driverId: 1, status: 1 });

export const Ride = mongoose.model<IRide>('Ride', rideSchema);
