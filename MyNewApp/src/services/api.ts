import { storage } from './storage';
import { Platform } from 'react-native';

// API URL configuration
// Set EXPO_PUBLIC_API_URL in .env file to configure the backend URL

const getAPIUrl = (): string => {
  // Try environment variable first
  let apiUrl = process.env.EXPO_PUBLIC_API_URL;
  
  // Hardcoded production URL (used for local builds)
  const PRODUCTION_URL = 'https://api.freelazone.com';
  
  // Fallback to hardcoded production URL if:
  // - env var not set
  // - env var contains ${secrets. (unresolved secret)
  // - env var is not a valid URL
  if (!apiUrl || apiUrl.includes('${secrets.') || !apiUrl.startsWith('http')) {
    apiUrl = PRODUCTION_URL;
    console.log('⚠️ Using hardcoded production URL:', apiUrl);
  } else {
    console.log('🌐 Using API URL from environment:', apiUrl);
  }
  
  return apiUrl;
};

export const API_URL = getAPIUrl();

// Log API URL on startup (for debugging)
console.log('🌐 API URL:', API_URL);
console.log('📱 Platform:', Platform.OS);
console.log('🔧 Dev mode:', __DEV__);

class ApiClient {
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  private subscribeToRefresh(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback);
  }

  private onTokenRefreshed(newToken: string) {
    this.refreshSubscribers.forEach(callback => callback(newToken));
    this.refreshSubscribers = [];
  }

  private async refreshAccessToken(): Promise<string | null> {
    if (this.isRefreshing) {
      // Wait for the ongoing refresh to complete
      return new Promise((resolve) => {
        this.subscribeToRefresh((token) => resolve(token));
      });
    }

    this.isRefreshing = true;
    
    try {
      const refreshToken = await storage.getRefreshToken();
      if (!refreshToken) {
        console.error('❌ No refresh token available');
        await storage.clearAuth();
        return null;
      }

      console.log('🔄 Refreshing access token...');
      const response = await fetch(`${API_URL}/api/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        console.error('❌ Token refresh failed');
        await storage.clearAuth();
        return null;
      }

      const data = await response.json();
      
      if (data.token) {
        await storage.setToken(data.token);
        if (data.refreshToken) {
          await storage.setRefreshToken(data.refreshToken);
        }
        console.log('✅ Token refreshed successfully');
        this.onTokenRefreshed(data.token);
        return data.token;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error refreshing token:', error);
      await storage.clearAuth();
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const token = await storage.getToken();
    const fullUrl = `${API_URL}${endpoint}`;
    
    console.log(`📡 API Request: ${options.method || 'GET'} ${fullUrl}`);
    
    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
      });

      console.log(`📥 API Response: ${response.status} ${response.statusText}`);

      // Handle 401 - Token expired
      if (response.status === 401 && retryCount === 0) {
        console.log('🔑 Token expired, attempting refresh...');
        const newToken = await this.refreshAccessToken();
        
        if (newToken) {
          console.log('🔄 Retrying request with new token...');
          return this.request<T>(endpoint, options, retryCount + 1);
        } else {
          throw new Error('Session expired. Please login again.');
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'An error occurred' }));
        console.error(`❌ API Error:`, error);
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error: any) {
      // Enhanced error logging
      if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
        console.error(`❌ Network Error: Cannot reach ${API_URL}`);
        console.error(`💡 Check if:`);
        console.error(`   1. Backend is running on the configured port`);
        console.error(`   2. API URL is correct: ${API_URL}`);
        console.error(`   3. Device has internet connection`);
        console.error(`   4. Backend is deployed and accessible`);
        throw new Error(`Network error: Cannot connect to ${API_URL}. Please check your connection.`);
      }
      throw error;
    }
  }

  // Missions
  async getActiveMission(): Promise<any | null> {
    return this.request<any | null>('/api/missions/active', { method: 'GET' });
  }

  async rejectMission(missionId: string): Promise<any> {
    return this.request(`/api/missions/reject/${missionId}`, { method: 'POST' });
  }

  // Active ride for state restoration
  async getActiveRide(): Promise<any | null> {
    return this.request<any | null>('/api/rides/active', { method: 'GET' });
  }

  async rateDriver(rideId: string, rating: number, comment?: string): Promise<any> {
    return this.request('/api/rides/rate', {
      method: 'POST',
      body: JSON.stringify({ rideId, rating, comment }),
    });
  }

  // Generic GET request
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // Generic POST request
  async post<T>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Auth endpoints
  async sendOTP(phoneNumber: string): Promise<{ 
    status: string; 
    message: string;
    requiresOTP?: boolean;
    user?: any;
    token?: string;
    refreshToken?: string;
  }> {
    return this.request('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  }

  async verifyOTP(phoneNumber: string, code: string): Promise<{ status: string; user: any; token: string; refreshToken: string }> {
    const response = await this.request<{ status: string; user: any; token: string; refreshToken: string }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, code }),
    });
    
    // Store tokens
    if (response.token) {
      await storage.setToken(response.token);
      await storage.setRefreshToken(response.refreshToken);
    }
    
    // Map backend response to frontend User type
    const userData = response.user;
    const profileData = userData.profile || {};
    
    return {
      status: response.status,
      user: {
        _id: userData._id,
        phoneNumber: userData.phoneNumber,
        role: userData.role || 'client',
        isVerified: userData.isVerified || false,
        isDriverRequested: userData.isDriverRequested || false,
        banned: profileData.banned || false,
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        email: profileData.email,
        avatar: profileData.avatar,
        city: profileData.city || profileData.wilaya,
        wilaya: profileData.wilaya || profileData.city,
        vehicleType: profileData.vehicleType,
        rating: profileData.rating || 0,
        totalRatings: profileData.totalRatings || 0,
      },
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

  async getCurrentUser(): Promise<any> {
    const response = await this.request<any>('/api/users/me');
    return {
      _id: response._id,
      phoneNumber: response.phoneNumber,
      role: response.role,
      isVerified: response.isVerified,
      isDriverRequested: response.isDriverRequested,
      banned: response.banned || false,
      firstName: response.firstName || '',
      lastName: response.lastName || '',
      email: response.email,
      avatar: response.avatar,
      city: response.city || response.wilaya,
      wilaya: response.wilaya || response.city,
      vehicleType: response.vehicleType,
      rating: response.rating || 0,
      totalRatings: response.totalRatings || 0,
    };
  }

  async updateProfile(data: { 
    firstName?: string; 
    lastName?: string; 
    phoneNumber?: string; 
    email?: string; 
    avatar?: string; 
    city?: string; 
    wilaya?: string; 
    language?: string;
  }): Promise<any> {
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
    };
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

  async getDriverRequests(): Promise<any[]> {
    return this.request('/api/users/driver-requests');
  }

  // Admin endpoints
  async getAllUsers(): Promise<any[]> {
    return this.request('/api/admin/users');
  }

  async approveDriver(userId: string): Promise<any> {
    return this.request(`/api/admin/approve-driver/${userId}`, {
      method: 'POST',
    });
  }

  async rejectDriver(userId: string, reason?: string): Promise<any> {
    return this.request(`/api/admin/reject-driver/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async banUser(userId: string, reason?: string): Promise<any> {
    return this.request(`/api/admin/ban-user/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async unbanUser(userId: string): Promise<any> {
    return this.request(`/api/admin/unban-user/${userId}`, {
      method: 'POST',
    });
  }

  // File upload
  async uploadFile(file: { uri: string; type: string; name: string }): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', {
      uri: file.uri,
      type: file.type,
      name: file.name,
    } as any);

    const token = await storage.getToken();
    const response = await fetch(`${API_URL}/api/upload/image`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Upload failed');
    }

    const data = await response.json();
    return { url: data.data.url };
  }

  // Driver endpoints
  async getAvailableDrivers(
    pickupLocation: { lat: number; lng: number },
    destinationLocation: { lat: number; lng: number; address: string },
    vehicleType: string
  ): Promise<any> {
    return this.post('/api/drivers/available', {
      pickupLocation,
      destinationLocation,
      vehicleType,
    });
  }

  // Reports
  async createReport(data: {
    targetId: string;
    targetType: 'driver' | 'client';
    reason: string;
    description?: string;
    rideId?: string;
  }): Promise<any> {
    return this.post('/api/reports', data);
  }

  async getReports(): Promise<any[]> {
    return this.get('/api/reports');
  }

  // Update FCM Token
  async updateFCMToken(token: string): Promise<{ message: string }> {
    return this.request('/api/users/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  // Driver status management - persist to database
  async setDriverOnline(location: { lat: number; lng: number; heading?: number }, vehicleType?: string): Promise<any> {
    return this.post('/api/drivers/online', {
      location,
      vehicleType,
    });
  }

  async setDriverOffline(): Promise<any> {
    return this.post('/api/drivers/offline', {});
  }

  async updateDriverLocation(location: { lat: number; lng: number; heading?: number }): Promise<any> {
    return this.post('/api/drivers/location', location);
  }

  async getDriverStatus(): Promise<any> {
    return this.get('/api/drivers/status');
  }
}

export const api = new ApiClient();
