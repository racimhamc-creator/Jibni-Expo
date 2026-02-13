import { z } from 'zod';

export const phoneNumberSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');

export const otpSchema = z.string()
  .length(6, 'OTP must be 6 digits')
  .regex(/^\d+$/, 'OTP must contain only numbers');

export const loginSchema = z.object({
  phoneNumber: phoneNumberSchema,
});

export const verifyOtpSchema = z.object({
  phoneNumber: phoneNumberSchema,
  code: otpSchema,
});

export const missionRequestSchema = z.object({
  driverId: z.string().min(1, 'Driver ID is required'),
  pickupLocation: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().min(1, 'Pickup address is required'),
  }),
  destinationLocation: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().min(1, 'Destination address is required'),
  }),
  vehicleType: z.string().optional(),
});

export const profileUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().or(z.literal('')),
  city: z.string().optional(),
});
