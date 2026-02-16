import mongoose, { Schema, Document } from 'mongoose';

export type ReportType = 'user' | 'mission' | 'fraud' | 'other';
export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';

export interface IReport extends Document {
  reportId: string;
  reporterId: mongoose.Types.ObjectId;
  reportedId: mongoose.Types.ObjectId;
  rideId?: mongoose.Types.ObjectId;
  type: ReportType;
  reason: string;
  description?: string;
  severity: ReportSeverity;
  status: ReportStatus;
  reviewed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reportId: {
      type: String,
      unique: true,
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reportedId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rideId: {
      type: String, // Store as string (rideId like "RIDE-XXX")
    },
    type: {
      type: String,
      enum: ['user', 'mission', 'fraud', 'other'],
      default: 'other',
    },
    reason: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'investigating', 'resolved', 'dismissed'],
      default: 'pending',
    },
    reviewed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Generate reportId before validation
ReportSchema.pre('validate', function (next) {
  if (!this.reportId) {
    this.reportId = 'RPT-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  }
  next();
});

export const Report = mongoose.model<IReport>('Report', ReportSchema);
