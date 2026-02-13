import mongoose, { Schema, Document } from 'mongoose';

export type RideStatus = 
  | 'searching' 
  | 'assigned' 
  | 'accepted' 
  | 'driver_arrived' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled' 
  | 'no_driver_found';

export interface IRide extends Document {
  rideId: string;
  clientId: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;
  status: RideStatus;
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
    driverToClient?: number;
  };
  eta: {
    clientToDestination: number;
    driverToClient?: number;
  };
  vehicleType: 'moto' | 'car' | 'truck' | 'van';
  requestedAt: Date;
  assignedAt?: Date;
  acceptedAt?: Date;
  driverArrivedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: 'client' | 'driver';
  cancellationReason?: string;
  // Matching metadata
  matchedDrivers?: string[]; // Array of driver IDs that were sent the request
  currentDriverIndex?: number; // Index of current driver being matched
  matchingTimeoutId?: string; // Reference to timeout for cleanup
  createdAt: Date;
  updatedAt: Date;
}

const RideSchema = new Schema<IRide>(
  {
    rideId: {
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
      required: false,
    },
    status: {
      type: String,
      enum: ['searching', 'assigned', 'accepted', 'driver_arrived', 'in_progress', 'completed', 'cancelled', 'no_driver_found'],
      default: 'searching',
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
      currency: { type: String, default: 'DZD' },
    },
    distance: {
      clientToDestination: { type: Number, required: true },
      driverToClient: { type: Number },
    },
    eta: {
      clientToDestination: { type: Number, required: true },
      driverToClient: { type: Number },
    },
    vehicleType: {
      type: String,
      enum: ['moto', 'car', 'truck', 'van'],
      required: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    assignedAt: Date,
    acceptedAt: Date,
    driverArrivedAt: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancelledBy: {
      type: String,
      enum: ['client', 'driver'],
    },
    cancellationReason: String,
    matchedDrivers: [String],
    currentDriverIndex: Number,
    matchingTimeoutId: String,
  },
  {
    timestamps: true,
  }
);

// Index for geospatial queries
RideSchema.index({ 'pickupLocation.lat': 1, 'pickupLocation.lng': 1 });
RideSchema.index({ status: 1, requestedAt: -1 });

export const Ride = mongoose.model<IRide>('Ride', RideSchema);
