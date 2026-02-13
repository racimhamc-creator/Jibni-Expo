export type UserRole = 'client' | 'driver';

export interface User {
  _id: string;
  phoneNumber: string;
  role: UserRole;
  isVerified: boolean;
  isDriverRequested?: boolean; // Client requested to become a driver
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  openToWork: boolean;
  engaged: boolean;
  banned: boolean;
  city?: string;
  drivingLicense?: {
    url: string;
    number: string;
    expiryDate: string;
  };
  vehicleCard?: {
    url: string;
    number: string;
  };
  fcmToken?: string;
  createdAt: string;
  updatedAt: string;
}
