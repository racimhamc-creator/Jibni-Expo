import mongoose, { Schema, Document } from 'mongoose';

export interface IOTP extends Document {
  phoneNumber: string;
  code: string;
  expiresAt: Date;
  verified: boolean;
  createdAt: Date;
}

const OTPSchema = new Schema<IOTP>(
  {
    phoneNumber: {
      type: String,
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const OTP = mongoose.model<IOTP>('OTP', OTPSchema);
