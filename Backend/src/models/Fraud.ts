import mongoose, { Schema, Document } from 'mongoose';

export interface IFraud extends Document {
  missionId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  driverId: mongoose.Types.ObjectId;
  alerts: {
    type: string;
    message: string;
    timestamp: Date;
    location?: {
      lat: number;
      lng: number;
    };
  }[];
  riskScore: number;
  status: 'pending' | 'investigating' | 'confirmed' | 'dismissed';
  description: string;
  evidence: string;
  viewed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FraudAlertSchema = new Schema({
  type: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  location: {
    lat: Number,
    lng: Number,
  },
}, { _id: false });

const FraudSchema = new Schema<IFraud>(
  {
    missionId: {
      type: Schema.Types.ObjectId,
      ref: 'Mission',
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    alerts: [FraudAlertSchema],
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ['pending', 'investigating', 'confirmed', 'dismissed'],
      default: 'pending',
    },
    description: {
      type: String,
      default: '',
    },
    evidence: {
      type: String,
      default: '',
    },
    viewed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

FraudSchema.index({ clientId: 1, status: 1 });
FraudSchema.index({ createdAt: -1 });
FraudSchema.index({ status: 1, riskScore: -1 });

export const Fraud = mongoose.model<IFraud>('Fraud', FraudSchema);
