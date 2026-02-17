import axios from 'axios';

// Backend API URL - Production Railway server
const API_BASE_URL = (process.env.REACT_APP_API_URL || 'https://jibni-new-production.up.railway.app/api') + '/v1/dashboard';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: sends cookies with requests
});

// Add request interceptor to add auth token from localStorage (fallback for cross-origin)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ===== Types =====

// Legacy User type (alias for Server)
export interface User {
  _id: string;
  id?: string;
  user_id?: string;
  userId?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone_number: string;
  phoneNumber?: string;
  city: string;
  rating: number;
  totalRatings?: number;
  banned: boolean;
  last_active?: string;
  lastActive?: string;
  mission_count?: number;
  totalMissions?: number;
  revenue?: number;
  totalRevenue?: number;
  engaged?: boolean;
  openToWork?: boolean;
  isOnline?: boolean;
  driving_license?: string;
  drivingLicense?: string;
  gray_card?: string;
  grayCard?: string;
  licence_id?: string;
  licenceId?: string;
  gray_card_id?: string;
  grayCardId?: string;
  createdAt?: string;
}

export interface Server {
  id: string;
  _id?: string;
  user_id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone_number: string;
  phoneNumber?: string;
  city: string;
  rating: number;
  totalRatings?: number;
  banned: boolean;
  last_active: string;
  lastActive?: string;
  mission_count: number;
  totalMissions?: number;
  revenue: number;
  totalRevenue?: number;
  engaged: boolean;
  openToWork?: boolean;
  driving_license?: string;
  drivingLicense?: string;
  gray_card?: string;
  grayCard?: string;
  licence_id?: string;
  licenceId?: string;
  gray_card_id?: string;
  grayCardId?: string;
  createdAt?: string;
}

// Legacy DriverRanking type (alias for Server)
export interface DriverRanking {
  _id: string;
  id?: string;
  user_id?: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  phone_number?: string;
  totalRevenue: number;
  totalMissions: number;
  rating: number;
  openToWork: boolean;
  isOnline?: boolean;
}

export interface Client {
  _id?: string;
  id: string;
  user_id: string;
  phone_number: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  banned: boolean;
  beneficiaire: boolean;
  totalMissions?: number;
  createdAt?: string;
}

export interface DriverRequest {
  _id?: string;
  id: string;
  userId?: string;
  user_id: string;
  submitted_at: string;
  submittedAt?: string;
  reviewed: boolean;
  approved: boolean;
  rejection_reason: string | null;
  rejectionReason?: string | null;
  profile: {
    firstName: string;
    lastName: string;
    name?: string;
    phoneNumber: string;
    phone_number?: string;
    city: string;
    wilaya?: string;
    role: string;
    drivingLicense?: string | null;
    driving_license?: string | null;
    grayCard?: string | null;
    gray_card?: string | null;
    licenceId?: string | null;
    licence_id?: string | null;
    grayCardId?: string | null;
    gray_card_id?: string | null;
  };
}

export interface Mission {
  _id?: string;
  id: string;
  mission_id: string;
  missionId?: string;
  rideId?: string;
  mission?: string;
  client_id: string;
  server_id?: string;
  driverId?: string;
  client?: string;
  clientPhone?: string;
  client_phone_number?: string;
  server_phone_number?: string;
  server_name?: string;
  depanneur?: string;
  driverName?: string;
  driverPhone?: string;
  client_lat?: number;
  client_lng?: number;
  destination_lat?: number;
  destination_lng?: number;
  status: 'searching' | 'assigned' | 'accepted' | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled' | 'no_driver_found' | 'PENDING' | 'ACTIVE' | 'REJECTED' | 'CANCELLED' | 'TIMEOUT' | 'EXPIRED' | 'COMPLETED' | 'IN_PROGRESS' | 'ACCEPTED' | 'DRIVER_ARRIVED';
  price: number;
  tarif?: number;
  currency?: string;
  rating?: number;
  comment?: string;
  cancellationReason?: string;
  notes?: string;
  vehicleType?: string;
  date?: string;
  created_at: string;
  createdAt?: string;
  pickup?: {
    address: string;
    lat?: number;
    lng?: number;
    wilaya?: string;
  };
  pickupAddress?: string;
  destinationAddress?: string;
  destination?: {
    from: string;
    to: string;
    fromLat: number;
    fromLng: number;
    toLat: number;
    toLng: number;
  };
  dropoff?: {
    address: string;
    lat?: number;
    lng?: number;
    wilaya?: string;
  };
  clientInfo?: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  driverInfo?: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
}

export interface Report {
  _id: string;
  id: string;
  subject: string;
  content: string;
  type?: string;
  reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  description?: string;
  reporter_id: string;
  reported_id: string;
  reporter_phone_number?: string;
  reported_phone_number?: string;
  mission_id?: string;
  created_at: string;
  createdAt?: string;
  reviewed: boolean;
  reporter?: {
    firstName: string;
    lastName: string;
    phoneNumber?: string;
  };
  reported?: {
    firstName: string;
    lastName: string;
    phoneNumber?: string;
  };
}

export interface FraudAlert {
  id: string;
  mission_id: string;
  missionId?: string;
  client_phone_number?: string;
  server_phone_number?: string;
  viewed: boolean;
  alerts: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  created_at: string;
  createdAt?: string;
}

export interface DashboardStats {
  // Core stats
  totalUsers: number;
  totalClients: number;
  totalDrivers: number;
  activeDrivers: number;
  bannedUsers: number;
  pendingDriverRequests: number;
  totalMissions: number;
  totalRevenue: number;
  
  // Growth percentages
  userGrowth: number;
  driverGrowth: number;
  bannedGrowth: number;
  missionsGrowth: number;
  revenueGrowth: number;
  
  // Legacy API properties
  missions_count: number;
  sum_price: number;
  avg_price: number;
  distinct_servers: number;
  completion_rate_percent: number;
  avg_rating: number;
  max_price: number;
  min_price: number;
  max_rating: number;
  min_rating: number;
  revenue_growth_percent: number;
  
  // Charts data
  calendar: Array<{
    date: string;
    missions: number;
    revenue: number;
    clients: number;
    drivers: number;
  }>;
  hours?: Array<{
    hour: number;
    missions: number;
    revenue: number;
  }>;
  
  // Status and breakdowns
  status_breakdown: Array<{
    status: string;
    count: number;
  }>;
  missionsByStatus: Array<{
    _id: string;
    count: number;
  }>;
  rating_histogram: Array<{
    rating: number;
    count: number;
  }>;
  
  // Top performers
  top_3_by_revenue: Server[];
  bottom_3_by_revenue: Server[];
  topDrivers: Server[];
  
  // Recent activity
  recentMissions: Mission[];
}

export interface ServerStatus {
  disk: Array<{
    device: string;
    type: string;
    total: number;
    used: number;
    free: number;
    percent: number;
  }>;
  memory: {
    total: number;
    available: number;
    used: number;
    free: number;
    percent: number;
  };
  cpu: {
    cores: number;
    model: string;
    speed: number;
    percent: number;
    load_average: number[];
  };
  network: Array<{
    interface: string;
    bytes_sent: number;
    bytes_recv: number;
    packets_sent: number;
    packets_recv: number;
    errin: number;
    errout: number;
    speed: number;
  }>;
  os: {
    platform: string;
    distro: string;
    release: string;
    codename: string;
    kernel: string;
    arch: string;
    hostname: string;
    uptime: number;
  };
  timestamp: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  ordering?: string;
}

// ===== API Functions =====

export const adminAPI = {
  // Servers (Drivers) Management
  getServers: async (params?: PaginationParams & {
    banned?: boolean;
    open_to_work?: boolean;
  }): Promise<{ servers: Server[]; pagination: any }> => {
    const response = await api.get('/servers/', { params });
    return response.data.data;
  },

  getServerById: async (id: string): Promise<Server> => {
    const response = await api.get(`/servers/${id}/`);
    return response.data.data;
  },

  // Clients Management
  getClients: async (params?: PaginationParams & {
    banned?: boolean;
    beneficiaire?: boolean;
  }): Promise<{ clients: Client[]; pagination: any }> => {
    const response = await api.get('/clients/', { params });
    return response.data.data;
  },

  getClientById: async (id: string): Promise<Client> => {
    const response = await api.get(`/clients/${id}/`);
    return response.data.data;
  },

  // Ban/Unban Users
  banUser: async (userId: string, action: 'ban' | 'unban' | boolean, reason?: string): Promise<any> => {
    const actionStr = typeof action === 'boolean' ? (action ? 'ban' : 'unban') : action;
    const response = await api.post('/ban-user/', { user_id: userId, action: actionStr, reason });
    return response.data.data;
  },

  // Driver Upgrade Requests
  getDriverRequests: async (params?: PaginationParams & {
    reviewed?: boolean;
    approved?: boolean;
    date_from?: string;
    date_to?: string;
  }): Promise<{ requests: DriverRequest[]; pagination: any }> => {
    const response = await api.get('/requests/', { params });
    return response.data.data;
  },

  getRequestById: async (id: string): Promise<DriverRequest> => {
    const response = await api.get(`/requests/${id}/`);
    return response.data.data;
  },

  approveRequest: async (requestId: string, licenceId?: string, grayCardId?: string): Promise<any> => {
    const response = await api.post(`/requests/${requestId}/approve/`, { licenceId, grayCardId });
    return response.data.data;
  },

  rejectRequest: async (requestId: string, reason: string): Promise<any> => {
    const response = await api.post(`/requests/${requestId}/reject/`, { rejection_reason: reason });
    return response.data.data;
  },

  // Missions Management
  getMissions: async (params?: PaginationParams & {
    status?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<{ missions: Mission[]; pagination: any }> => {
    const response = await api.get('/missions/', { params });
    return response.data.data;
  },

  getMissionById: async (id: string): Promise<Mission> => {
    const response = await api.get(`/missions/${id}/`);
    return response.data.data;
  },

  deleteMission: async (missionId: string): Promise<any> => {
    const response = await api.delete(`/missions/${missionId}/`);
    return response.data.data;
  },

  // Reports Management
  getReports: async (params?: PaginationParams & {
    reviewed?: boolean;
  }): Promise<{ reports: Report[]; pagination: any }> => {
    const response = await api.get('/reports/', { params });
    return response.data.data;
  },

  getReportById: async (id: string): Promise<Report> => {
    const response = await api.get(`/reports/${id}/`);
    return response.data.data;
  },

  markReportReviewed: async (reportId: string): Promise<any> => {
    const response = await api.post(`/reports/${reportId}/mark_reviewed/`);
    return response.data.data;
  },

  updateReportStatus: async (reportId: string, status: string): Promise<any> => {
    const response = await api.post(`/reports/${reportId}/update_status/`, { status });
    return response.data.data;
  },

  // Fraud Alerts
  getFraudAlerts: async (params?: PaginationParams & {
    viewed?: boolean;
  }): Promise<{ frauds: FraudAlert[]; pagination: any }> => {
    const response = await api.get('/frauds/', { params });
    return response.data.data;
  },

  getFraudAlertById: async (id: string): Promise<FraudAlert> => {
    const response = await api.get(`/frauds/${id}/`);
    return response.data.data;
  },

  markFraudViewed: async (fraudId: string): Promise<any> => {
    const response = await api.post(`/frauds/${fraudId}/mark_viewed/`);
    return response.data.data;
  },

  getFraudCases: async (params?: PaginationParams & {
    viewed?: boolean;
  }): Promise<{ cases: FraudAlert[]; pagination: any }> => {
    const data = await adminAPI.getFraudAlerts(params);
    return { cases: data.frauds, pagination: data.pagination };
  },

  updateFraudCase: async (fraudId: string, status: string, action?: string): Promise<any> => {
    const response = await api.post(`/frauds/${fraudId}/update/`, { status, action });
    return response.data.data;
  },

  // Statistics & Analytics
  getStats: async (period: 'week' | 'month' | 'three_months' = 'month'): Promise<DashboardStats> => {
    const response = await api.get('/stats/', { params: { period } });
    return response.data.data;
  },

  getCalendarBreakdown: async (
    type: 'missions' | 'revenue' | 'new_users' | 'driver_requests',
    startDate?: string,
    endDate?: string
  ): Promise<any[]> => {
    const response = await api.get('/stats/calendar/', { params: { type, startDate, endDate } });
    return response.data.data?.calendar || [];
  },

  getHourlyBreakdown: async (type: 'missions' | 'revenue', date?: string): Promise<any[]> => {
    const response = await api.get('/stats/hours/', { params: { type, date } });
    return response.data.data?.hours || [];
  },

  // Server Status
  getServerStatus: async (): Promise<ServerStatus> => {
    const response = await api.get('/server-status/');
    return response.data.data;
  },

  // Driver Profile & Missions
  getDriverProfile: async (driverId: string): Promise<{
    profile: {
      _id: string;
      userId: string;
      firstName: string;
      lastName: string;
      fullName: string;
      phoneNumber?: string;
      email?: string;
      city?: string;
      avatar?: string;
      rating?: number;
      totalRatings?: number;
      totalRevenue?: number;
      totalMissions?: number;
      isOnline?: boolean;
      openToWork?: boolean;
      engaged?: boolean;
      banned?: boolean;
      drivingLicense?: any;
      vehicleCard?: any;
      vehicleType?: string;
      role?: string;
      createdAt?: string;
    };
    stats: {
      active: number;
      completed: number;
      cancelled: number;
      no_driver_found: number;
      total: number;
    };
    missions: Array<{
      id: string;
      rideId: string;
      clientPhone: string;
      date: string;
      createdAt: string;
      status: string;
      price: number;
      currency: string;
      rating: number;
      pickupAddress?: string;
      destinationAddress?: string;
    }>;
  }> => {
    const response = await api.get(`/drivers/${driverId}/profile`);
    return response.data.data;
  },

  // Upload driver documents (admin)
  uploadDriverDocuments: async (driverId: string, formData: FormData): Promise<any> => {
    const response = await api.post(`/drivers/${driverId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  // Legacy endpoints for backward compatibility
  getUsers: async (params?: any): Promise<{ users: any[]; pagination: any }> => {
    const data = await adminAPI.getClients(params);
    return { users: data.clients, pagination: data.pagination };
  },

  getDrivers: async (params?: any): Promise<{ drivers: Server[]; pagination: any }> => {
    const data = await adminAPI.getServers(params);
    return { drivers: data.servers, pagination: data.pagination };
  },

  getDashboardStats: async (period?: string): Promise<DashboardStats> => {
    const stats = await adminAPI.getStats(period as any);
    // Return the backend data directly - it now includes all fields
    return stats as DashboardStats;
  },

  getDriverRankings: async (type: string, limit: number = 10): Promise<Server[]> => {
    const response = await api.get('/servers/', { 
      params: { 
        ordering: type === 'top_revenue' ? '-revenue' : 
                  type === 'lowest_revenue' ? 'revenue' :
                  type === 'top_rated' ? '-rating' :
                  type === 'lowest_rated' ? 'rating' :
                  type === 'most_active' ? '-mission_count' :
                  type === 'least_active' ? 'mission_count' : '-revenue',
        limit 
      } 
    });
    return response.data.data?.servers || [];
  },
};

export default api;
