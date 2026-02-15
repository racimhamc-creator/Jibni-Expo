import axios from 'axios';

// Backend API URL - Update this to match your backend server
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://10.168.169.202:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ===== Types =====

export interface User {
  _id: string;
  id?: string;
  user_id?: string;
  phoneNumber: string;
  phone_number?: string;
  role: 'client' | 'driver';
  isVerified: boolean;
  isDriverRequested: boolean;
  isBanned: boolean;
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
  totalRevenue?: number;
  totalMissions?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DriverRequest {
  _id: string;
  id?: string;
  userId: string;
  user_id?: string;
  phoneNumber: string;
  submittedAt: string;
  submitted_at?: string;
  reviewed: boolean;
  approved: boolean;
  rejectionReason: string | null;
  rejection_reason?: string | null;
  profile: {
    firstName: string;
    lastName: string;
    name: string;
    phoneNumber: string;
    phone_number?: string;
    city: string;
    wilaya?: string;
    role: string;
    drivingLicense: string | null;
    driving_license?: string | null;
    grayCard: string | null;
    gray_card?: string | null;
    licenceId: string | null;
    licence_id?: string | null;
    grayCardId: string | null;
    gray_card_id?: string | null;
  };
}

export interface DashboardStats {
  totalUsers: number;
  totalClients: number;
  totalDrivers: number;
  pendingDriverRequests: number;
  bannedUsers: number;
  totalMissions: number;
  totalRevenue: number;
  missionsByStatus: Array<{ _id: string; count: number }>;
  topDrivers: User[];
  recentMissions: Mission[];
}

export interface Mission {
  _id: string;
  missionId: string;
  clientId: string;
  driverId?: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  pickup: {
    address: string;
    wilaya: string;
    coordinates?: { lat: number; lng: number };
  };
  dropoff: {
    address: string;
    wilaya: string;
    coordinates?: { lat: number; lng: number };
  };
  vehicleType: string;
  price: number;
  distance?: number;
  duration?: number;
  scheduledAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  rating?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  client?: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  driver?: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
}

export interface Report {
  _id: string;
  reporterId: string;
  reportedId: string;
  missionId: string;
  type: string;
  reason: string;
  description?: string;
  status: string;
  severity: string;
  createdAt: string;
  updatedAt: string;
  reporter?: User;
  reported?: User;
  mission?: Mission;
}

export interface DriverRanking {
  _id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  totalRevenue: number;
  totalMissions: number;
  rating: number;
  openToWork: boolean;
}

// ===== API Functions =====

export const adminAPI = {
  // Users
  getUsers: async (params?: { page?: number; limit?: number; search?: string; role?: string; banned?: boolean }): Promise<{ users: User[]; pagination: any }> => {
    const response = await api.get('/admin/users', { params });
    return response.data.data || { users: [], pagination: {} };
  },

  banUser: async (userId: string, banned: boolean, reason?: string): Promise<any> => {
    const response = await api.patch(`/admin/users/${userId}/ban`, { banned, reason });
    return response.data;
  },

  // Drivers
  getDrivers: async (params?: { page?: number; limit?: number; search?: string; openToWork?: boolean; sortBy?: string }): Promise<{ drivers: User[]; pagination: any }> => {
    const response = await api.get('/admin/drivers', { params });
    return response.data.data || { drivers: [], pagination: {} };
  },

  getDriverRankings: async (type: 'top_revenue' | 'lowest_revenue' | 'top_rated' | 'lowest_rated' | 'most_active' | 'least_active' | 'busiest_day', limit: number = 10): Promise<DriverRanking[]> => {
    const response = await api.get('/admin/drivers/rankings', { params: { type, limit } });
    return response.data.data?.rankings || [];
  },

  // Driver Requests
  getDriverRequests: async (params?: { reviewed?: boolean; approved?: boolean; page?: number; limit?: number }): Promise<{ requests: DriverRequest[]; pagination: any }> => {
    const response = await api.get('/admin/driver-requests', { params });
    return response.data.data || { requests: [], pagination: {} };
  },

  approveRequest: async (userId: string, licenceId?: string, grayCardId?: string): Promise<any> => {
    const response = await api.post(`/admin/driver-requests/${userId}/approve`, { licenceId, grayCardId });
    return response.data;
  },

  rejectRequest: async (userId: string, reason: string): Promise<any> => {
    const response = await api.post(`/admin/driver-requests/${userId}/reject`, { rejectionReason: reason });
    return response.data;
  },

  // Dashboard Stats
  getDashboardStats: async (period: 'week' | 'month' | '3months' | '6months' | 'year' = 'month'): Promise<DashboardStats> => {
    const response = await api.get('/admin/stats', { params: { period } });
    return response.data.data;
  },

  getCalendarBreakdown: async (type: 'missions' | 'revenue' | 'new_users' | 'driver_requests', startDate?: string, endDate?: string): Promise<any[]> => {
    const response = await api.get('/admin/stats/calendar', { params: { type, startDate, endDate } });
    return response.data.data?.breakdown || [];
  },

  getHourlyBreakdown: async (type: 'missions' | 'revenue', date?: string): Promise<any[]> => {
    const response = await api.get('/admin/stats/hourly', { params: { type, date } });
    return response.data.data?.breakdown || [];
  },

  // Missions
  getMissions: async (params?: { page?: number; limit?: number; status?: string; search?: string; startDate?: string; endDate?: string }): Promise<{ missions: Mission[]; pagination: any }> => {
    const response = await api.get('/admin/missions', { params });
    return response.data.data || { missions: [], pagination: {} };
  },

  getMissionById: async (missionId: string): Promise<Mission> => {
    const response = await api.get(`/admin/missions/${missionId}`);
    return response.data.data?.mission;
  },

  updateMission: async (missionId: string, data: Partial<Mission>): Promise<any> => {
    const response = await api.put(`/admin/missions/${missionId}`, data);
    return response.data;
  },

  deleteMission: async (missionId: string): Promise<any> => {
    const response = await api.delete(`/admin/missions/${missionId}`);
    return response.data;
  },

  // Reports
  getReports: async (params?: { status?: string; type?: string; severity?: string; page?: number; limit?: number }): Promise<{ reports: Report[]; pagination: any }> => {
    const response = await api.get('/admin/reports', { params });
    return response.data.data || { reports: [], pagination: {} };
  },

  updateReportStatus: async (reportId: string, status: string): Promise<any> => {
    const response = await api.patch(`/admin/reports/${reportId}`, { status });
    return response.data;
  },

  // Fraud Detection
  getFraudCases: async (params?: { status?: string; type?: string; page?: number; limit?: number }): Promise<any> => {
    const response = await api.get('/admin/fraud', { params });
    return response.data.data || { cases: [], pagination: {} };
  },

  updateFraudCase: async (caseId: string, status: string, action?: string): Promise<any> => {
    const response = await api.patch(`/admin/fraud/${caseId}`, { status, action });
    return response.data;
  },
};

export default api;
