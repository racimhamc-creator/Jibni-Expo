import { User, Profile } from '@/types/user';
import { Mission, MissionRequest } from '@/types/mission';
import { NearbyDriver } from '@/types/location';
import { storage } from './storage';

// API URL configuration
// For physical device: Use your computer's IP address (e.g., http://192.168.1.33:8000)
// For emulator/simulator: Use localhost (http://localhost:8000)
// You can also set EXPO_PUBLIC_API_URL in a .env file
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.168.169.202:8000';

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await storage.getToken();
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async sendOTP(phoneNumber: string): Promise<{ 
    status: string; 
    message: string;
    requiresOTP?: boolean;
    user?: User;
    token?: string;
    refreshToken?: string;
  }> {
    return this.request('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  }

  async verifyOTP(phoneNumber: string, code: string): Promise<{ status: string; user: User; token: string; refreshToken: string }> {
    const response = await this.request<{ status: string; user: any; token: string; refreshToken: string }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, code }),
    });
    
    // Map backend response to frontend User type
    return {
      status: response.status,
      user: {
        _id: response.user._id || response.user.user?._id,
        phoneNumber: response.user.phoneNumber || response.user.user?.phoneNumber,
        role: response.user.role || response.user.user?.role || 'client',
        isVerified: response.user.isVerified || response.user.user?.isVerified || false,
        isDriverRequested: response.user.isDriverRequested || response.user.user?.isDriverRequested || false,
        firstName: response.user.firstName || '',
        lastName: response.user.lastName || '',
        email: response.user.email,
        avatar: response.user.avatar,
        city: response.user.city || response.user.wilaya,
        wilaya: response.user.wilaya || response.user.city,
        vehicleType: response.user.vehicleType,
        rating: response.user.rating || 0,
        totalRatings: response.user.totalRatings || 0,
      } as User,
      token: response.token,
      refreshToken: response.refreshToken,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    return this.request('/api/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async logout(): Promise<{ message: string }> {
    return this.request('/api/auth/logout', {
      method: 'POST',
    });
  }

  // Drivers endpoints
  async getNearbyDrivers(lat: number, lng: number): Promise<NearbyDriver[]> {
    return this.request(`/api/drivers/nearby?lat=${lat}&lng=${lng}`);
  }

  async toggleAvailability(openToWork: boolean): Promise<{ message: string }> {
    return this.request('/api/drivers/toggle-availability', {
      method: 'POST',
      body: JSON.stringify({ openToWork }),
    });
  }

  async registerDriver(data: FormData): Promise<{ message: string }> {
    const token = await storage.getToken();
    const response = await fetch(`${API_URL}/api/drivers/register`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: data,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getDriverStatus(): Promise<{ status: string }> {
    return this.request('/api/drivers/status');
  }

  // Missions endpoints
  async requestMission(data: MissionRequest): Promise<Mission> {
    return this.request('/api/missions/request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async acceptMission(missionId: string): Promise<Mission> {
    return this.request(`/api/missions/${missionId}/accept`, {
      method: 'POST',
    });
  }

  async rejectMission(missionId: string): Promise<{ message: string }> {
    return this.request(`/api/missions/${missionId}/reject`, {
      method: 'POST',
    });
  }

  async completeMission(missionId: string): Promise<Mission> {
    return this.request(`/api/missions/${missionId}/complete`, {
      method: 'POST',
    });
  }

  async cancelMission(missionId: string): Promise<Mission> {
    return this.request(`/api/missions/${missionId}/cancel`, {
      method: 'POST',
    });
  }

  async getActiveMission(): Promise<Mission | null> {
    return this.request('/api/missions/active');
  }

  async getMissionHistory(): Promise<Mission[]> {
    return this.request('/api/missions/history');
  }

  // Users endpoints
  async getCurrentUser(): Promise<User> {
    const response = await this.request<any>('/api/users/me');
    return {
      _id: response._id,
      phoneNumber: response.phoneNumber,
      role: response.role,
      isVerified: response.isVerified,
      isDriverRequested: response.isDriverRequested,
      firstName: response.firstName || '',
      lastName: response.lastName || '',
      email: response.email,
      avatar: response.avatar,
      city: response.city || response.wilaya,
      wilaya: response.wilaya || response.city,
      vehicleType: response.vehicleType,
      rating: response.rating || 0,
      totalRatings: response.totalRatings || 0,
    } as User;
  }

  async updateProfile(data: { firstName?: string; lastName?: string; phoneNumber?: string; email?: string; avatar?: string; city?: string; wilaya?: string }): Promise<User> {
    const response = await this.request<any>('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return {
      _id: response._id,
      phoneNumber: response.phoneNumber,
      role: response.role,
      isVerified: response.isVerified,
      isDriverRequested: response.isDriverRequested,
      firstName: response.firstName || '',
      lastName: response.lastName || '',
      email: response.email,
      avatar: response.avatar,
      city: response.city || response.wilaya,
      wilaya: response.wilaya || response.city,
      vehicleType: response.vehicleType,
      rating: response.rating || 0,
      totalRatings: response.totalRatings || 0,
    } as User;
  }

  async requestDriver(data: {
    firstName: string;
    lastName: string;
    wilaya?: string;
    city?: string;
    drivingLicense?: { url: string; number?: string };
    grayCard?: { url: string; number?: string };
  }): Promise<{ status: string; message: string; isDriverRequested: boolean }> {
    return this.request('/api/users/request-driver', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFCMToken(token: string): Promise<{ message: string }> {
    return this.request('/api/users/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }
}

export const api = new ApiClient();
