import mongoose, { Schema, Document } from 'mongoose';

export interface IMission extends Document {
  missionId: string;
  clientId: mongoose.Types.ObjectId;
  driverId: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'rejected' | 'timeout';
  pickupLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  destinationLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  pricing: {
    basePrice: number;
    distancePrice: number;
    totalPrice: number;
    currency: string;
  };
  distance: {
    clientToDestination: number;
    driverToClient: number;
  };
  eta: {
    clientToDestination: number;
    driverToClient: number;
  };
  requestedAt: Date;
  acceptedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: 'client' | 'driver';
  rating?: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MissionSchema = new Schema<IMission>(
  {
    missionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    pickupLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, required: true },
    },
    destinationLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, required: true },
    },
    pricing: {
      basePrice: { type: Number, required: true },
      distancePrice: { type: Number, required: true },
      totalPrice: { type: Number, required: true },
      currency: { type: String, default: 'USD' },
    },
    distance: {
      clientToDestination: { type: Number, required: true },
      driverToClient: { type: Number, required: true },
    },
    eta: {
      clientToDestination: { type: Number, required: true },
      driverToClient: { type: Number, required: true },
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancelledBy: {
      type: String,
      enum: ['client', 'driver'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const Mission = mongoose.model<IMission>('Mission', MissionSchema);
