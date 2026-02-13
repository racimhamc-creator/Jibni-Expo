import axios from 'axios';

// Backend API URL - Update this to match your backend server
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://10.168.169.202:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor (if you implement admin auth later)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  _id: string;
  id?: string; // For backward compatibility
  user_id?: string; // For backward compatibility
  phoneNumber: string;
  phone_number?: string; // For backward compatibility
  role: 'client' | 'driver';
  isVerified: boolean;
  isDriverRequested: boolean;
  firstName: string;
  lastName: string;
  email?: string;
  avatar?: string;
  city: string;
  wilaya?: string;
  vehicleType?: string;
  rating: number;
  totalRatings: number;
  openToWork?: boolean;
  engaged?: boolean;
  banned: boolean;
  hasMissions: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DriverRequest {
  _id: string;
  id?: string; // For backward compatibility
  userId: string;
  user_id?: string; // For backward compatibility
  phoneNumber: string;
  submittedAt: string;
  submitted_at?: string; // For backward compatibility
  reviewed: boolean;
  approved: boolean;
  rejectionReason: string | null;
  rejection_reason?: string | null; // For backward compatibility
  profile: {
    firstName: string;
    lastName: string;
    name: string;
    phoneNumber: string;
    phone_number?: string; // For backward compatibility
    city: string;
    wilaya?: string;
    role: string;
    drivingLicense: string | null;
    driving_license?: string | null; // For backward compatibility
    grayCard: string | null;
    gray_card?: string | null; // For backward compatibility
    licenceId: string | null;
    licence_id?: string | null; // For backward compatibility
    grayCardId: string | null;
    gray_card_id?: string | null; // For backward compatibility
  };
}

export const adminAPI = {
  getUsers: async (): Promise<User[]> => {
    try {
      const response = await api.get('/admin/users');
      if (response.data.status === 'success') {
        return response.data.data || [];
      }
      return response.data || [];
    } catch (error: any) {
      console.error('Error fetching users:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch users');
    }
  },

  getDriverRequests: async (): Promise<DriverRequest[]> => {
    try {
      const response = await api.get('/admin/driver-requests');
      if (response.data.status === 'success') {
        return response.data.data || [];
      }
      return response.data || [];
    } catch (error: any) {
      console.error('Error fetching driver requests:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch driver requests');
    }
  },

  approveRequest: async (userId: string, licenceId?: string, grayCardId?: string): Promise<any> => {
    try {
      const response = await api.post(`/admin/driver-requests/${userId}/approve`, {
        licenceId,
        grayCardId,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error approving request:', error);
      throw new Error(error.response?.data?.message || 'Failed to approve driver request');
    }
  },

  rejectRequest: async (userId: string, reason: string): Promise<any> => {
    try {
      const response = await api.post(`/admin/driver-requests/${userId}/reject`, {
        rejectionReason: reason,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      throw new Error(error.response?.data?.message || 'Failed to reject driver request');
    }
  },
};

export default api;
