import axios from 'axios';

// Configurable base URL (Vite env)
// - Default: Local development server for testing
// - Override: Set VITE_API_BASE_URL in .env file (e.g., for VPS production)
// Use same logic as Frontend - defaults to VPS in production, local in dev
// Use HTTPS if the page is served over HTTPS (to avoid mixed-content errors)
const isSecureContext = typeof window !== 'undefined' && window.location.protocol === 'https:';
const VPS_API_BASE_URL = isSecureContext 
  ? 'https://khadamatpro.net/api'  // Use HTTPS domain when page is HTTPS (avoids mixed-content)
  : 'http://168.119.236.241/api';  // Use HTTP IP when page is HTTP (local dev)
const DEV_LAN_API_BASE_URL = 'http://172.20.10.2:5000/api';

// Force use of VPS - ignore VITE_API_BASE_URL if it's set to .3 IP
// Note: khadamatpro.net is allowed when page is HTTPS (to avoid mixed-content)
let API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (API_BASE_URL) {
  if (API_BASE_URL.includes('172.20.10.3')) {
    console.warn('⚠️ VITE_API_BASE_URL contains 172.20.10.3, overriding to use 172.20.10.2');
    API_BASE_URL = null; // Force fallback to default
  }
  // Allow khadamatpro.net if page is HTTPS (needed to avoid mixed-content errors)
  if (API_BASE_URL.includes('khadamatpro.net') && !isSecureContext) {
    console.warn('⚠️ VITE_API_BASE_URL contains khadamatpro.net but page is HTTP, using VPS IP');
    API_BASE_URL = null; // Force fallback to VPS IP for HTTP pages
  }
}

API_BASE_URL = API_BASE_URL || 
  (import.meta.env.DEV ? DEV_LAN_API_BASE_URL : VPS_API_BASE_URL);

// Ensure the base URL is properly formatted
if (!API_BASE_URL.startsWith('http://') && !API_BASE_URL.startsWith('https://')) {
  API_BASE_URL = `http://${API_BASE_URL}`;
}

// Ensure it ends with /api (but preserve the port if present)
if (!API_BASE_URL.endsWith('/api')) {
  // Remove trailing slash if present
  API_BASE_URL = API_BASE_URL.replace(/\/$/, '');
  // Add /api if not already present
  if (!API_BASE_URL.endsWith('/api')) {
    API_BASE_URL = `${API_BASE_URL}/api`;
  }
}

// Safety check: Replace any .3 IP with .2
if (API_BASE_URL.includes('172.20.10.3')) {
  console.warn('⚠️ Detected 172.20.10.3, replacing with 172.20.10.2');
  API_BASE_URL = API_BASE_URL.replace(/172\.20\.10\.3/g, '172.20.10.2');
}

// Final validation - ensure port is included for local IPs
if (API_BASE_URL.includes('172.20.10.2') && !API_BASE_URL.includes(':5000')) {
  console.warn('⚠️ Port 5000 missing from API_BASE_URL, adding it...');
  API_BASE_URL = API_BASE_URL.replace('172.20.10.2', '172.20.10.2:5000');
}

console.log('🔧 API Base URL configured:', API_BASE_URL);
console.log('🔧 VITE_API_BASE_URL from env:', import.meta.env.VITE_API_BASE_URL);
console.log('🔧 DEV mode:', import.meta.env.DEV);
console.log('🔧 Page protocol:', typeof window !== 'undefined' ? window.location.protocol : 'N/A');
console.log('🔧 Using HTTPS domain:', isSecureContext ? 'Yes (to avoid mixed-content)' : 'No (HTTP page)');

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log all requests
api.interceptors.request.use((config) => {
  // Ensure baseURL is preserved correctly
  if (!config.baseURL) {
    config.baseURL = API_BASE_URL;
  }
  
  // Log the full URL that will be requested
  const fullUrl = config.url?.startsWith('http') 
    ? config.url 
    : `${config.baseURL}${config.url?.startsWith('/') ? '' : '/'}${config.url || ''}`;
  console.log(`[API Request] ${config.method?.toUpperCase()} ${fullUrl}`);
  console.log(`[API Request] baseURL: ${config.baseURL}, url: ${config.url}`);
  
  // Handle FormData - remove Content-Type header so axios can set it with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
    console.log('[API Request] FormData detected - Content-Type will be set automatically by axios');
  }
  
  // Add admin token for all /admin/* routes, /fashion-groups/admin/* routes, /notifications/* routes, /refunds/* routes, or /logs/* routes
  // Note: Cookie-based auth is preferred, but we also support header-based for compatibility
  const url = config.url || '';
  const isAdminRoute = url.includes('/admin/') || 
                       url.includes('/fashion-groups/admin/') || 
                       url.includes('/notifications/') ||
                       url.includes('/refunds/') ||
                       url.includes('/logs/') ||
                       url.startsWith('admin/');
  
  if (isAdminRoute) {
    const token = localStorage.getItem('adminToken');
    console.log('[Auth] Admin route detected, token:', token ? 'Found' : 'NOT FOUND');
    console.log('[Auth] Cookies will be sent automatically (withCredentials: true)');
    
    // Add Authorization header as fallback (cookie is primary auth method)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[Auth] Added Authorization header as fallback');
    } else {
      console.warn('[Auth] No admin token in localStorage - relying on cookie auth');
    }
  }
  
  return config;
}, (error) => {
  console.error('[API Request Error]', error);
  return Promise.reject(error);
});

// Log all responses
api.interceptors.response.use((response) => {
  console.log(`[API Response] ${response.status} ${response.config.url}`, response.data);
  return response;
}, (error) => {
  console.error(`[API Error] ${error.response?.status || 'Network Error'} ${error.config?.url}`, error.response?.data || error.message);
  return Promise.reject(error);
});

// Admin Auth
export const adminAPI = {
  login: (credentials) => {
    console.log('Calling admin login...');
    return api.post('/admin/login', {
      username: credentials.username,
      password: credentials.password,
    });
  },
  logout: () => api.post('/admin/logout'),
  getMe: () => api.get('/admin/me'),
  getDashboardStats: () => api.get('/admin/dashboard'),
};

// User Auth
export const userAuthAPI = {
  sendEmailOTP: (email) => api.post('/email/send-email-otp', { email }),
  verifyEmailOTP: (email, otp) => api.post('/email/verify-email-otp', { email, otp }),
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
};

// Admin / Users
export const authAPI = {
  getUsers: (limit = 1000, page = 1) => {
    console.log('Calling getUsers...');
    return api.get(`/admin/users?limit=${limit}&page=${page}`);
  },
  getUserProfile: (userId) => api.get(`/admin/profile?userId=${userId}`),
};

// Events
export const eventsAPI = {
  getAll: (isAdmin = false) => {
    console.log('Calling getAll events...');
    // Admin dashboard needs all events (active and inactive) without pagination
    if (isAdmin) {
      return api.get('/admin/events?limit=1000');
    }
    // User-facing: get only active events
    return api.get('/events');
  },
  getById: (eventId) => api.get(`/events/${eventId}`),
  create: (eventData) => api.post('/admin/events', eventData),
  update: (eventId, eventData) => api.put(`/admin/events/${eventId}`, eventData),
  delete: (eventId) => api.delete(`/admin/events/${eventId}`),
  purchase: (eventId, purchaseData) => api.post(`/events/${eventId}/purchase`, purchaseData),
  createCheckout: (eventId, checkoutData) => api.post(`/events/${eventId}/create-checkout`, checkoutData),
};

// Tickets
export const ticketsAPI = {
  getByUser: (userId) => api.get(`/events/user/${userId}/tickets`),
  getByTicketNumber: (ticketNumber) => api.get(`/events/ticket/${ticketNumber}`),
  getAll: (params = {}) => {
    console.log('Calling getAll tickets...', params);
    const { page = 1, limit = 20, status, eventId } = params;
    let url = `/admin/tickets?page=${page}&limit=${limit}`;
    if (status) url += `&status=${status}`;
    if (eventId) url += `&eventId=${eventId}`;
    return api.get(url);
  },
  getById: (ticketNumber) => api.get(`/admin/tickets/${ticketNumber}`),
  validate: (ticketNumber) => api.post(`/admin/tickets/${ticketNumber}/validate`),
  validateTicket: (ticketNumber) => api.post(`/admin/tickets/${ticketNumber}/validate`),
};

// Casting
export const castingAPI = {
  getApplications: (params = {}) => {
    console.log('Calling getApplications...', params);
    const { status, page = 1, limit = 20 } = params;
    let url = `/casting/applications?page=${page}&limit=${limit}`;
    if (status) url += `&status=${status}`;
    return api.get(url);
  },
  getApplicationById: (id) => api.get(`/casting/applications/${id}`),
  updateStatus: (id, data) => api.put(`/casting/applications/${id}/status`, data),
  getStats: () => {
    console.log('Calling casting getStats...');
    return api.get('/casting/stats');
  },
  deleteApplication: (id) => api.delete(`/casting/applications/${id}`),
  submit: (formData) => {
    console.log('Submitting casting application...');
    return api.post('/casting/submit', formData);
  },
};

// Hostesses Casting
export const hostessesAPI = {
  getApplications: (params = {}) => {
    console.log('Calling hostesses getApplications...', params);
    const { status, page = 1, limit = 20 } = params;
    let url = `/hostesses/applications?page=${page}&limit=${limit}`;
    if (status) url += `&status=${status}`;
    return api.get(url);
  },
  getApplication: (id) => api.get(`/hostesses/applications/${id}`),
  updateStatus: (id, data) => api.put(`/hostesses/applications/${id}/status`, data),
  getStats: () => {
    console.log('Calling hostesses getStats...');
    return api.get('/hostesses/stats');
  },
  deleteApplication: (id) => api.delete(`/hostesses/applications/${id}`),
  downloadPDF: (id) => api.get(`/hostesses/applications/${id}/pdf`, { responseType: 'blob' }),
  submit: (formData) => {
    console.log('Submitting hostesses application...');
    return api.post('/hostesses/submit', formData);
  },
};

// Talents Casting
export const talentsAPI = {
  getApplications: (params = {}) => {
    console.log('Calling talents getApplications...', params);
    const { status, page = 1, limit = 20 } = params;
    let url = `/talents/applications?page=${page}&limit=${limit}`;
    if (status) url += `&status=${status}`;
    return api.get(url);
  },
  getApplication: (id) => api.get(`/talents/applications/${id}`),
  updateStatus: (id, data) => api.put(`/talents/applications/${id}/status`, data),
  getStats: () => {
    console.log('Calling talents getStats...');
    return api.get('/talents/stats');
  },
  deleteApplication: (id) => api.delete(`/talents/applications/${id}`),
  downloadPDF: (id) => api.get(`/talents/applications/${id}/pdf`, { responseType: 'blob' }),
  submit: (formData) => {
    console.log('Submitting talents application...');
    return api.post('/talents/submit', formData);
  },
};

// Fashion Groups
export const fashionGroupsAPI = {
  getAll: () => api.get('/fashion-groups/admin/all'),
  getGroup: (groupName) => api.get(`/fashion-groups/admin/${groupName}`),
  updateGroup: (groupName, data) => api.post(`/fashion-groups/admin/${groupName}`, data),
  deleteGroup: (groupName) => api.delete(`/fashion-groups/admin/${groupName}`),
  getAllCastings: () => api.get('/fashion-groups/admin/castings'),
};

// Shooting Artists
export const shootingArtistsAPI = {
  getAll: () => api.get('/shooting-artists/admin/all'),
  getById: (id) => api.get(`/shooting-artists/${id}`),
  create: (formData) => {
    console.log('📸 Creating shooting artist, baseURL:', API_BASE_URL);
    console.log('📸 FormData entries:', Array.from(formData.entries()).map(([k, v]) => [k, v instanceof File ? `File: ${v.name} (${(v.size / 1024).toFixed(2)}KB)` : v]));
    
    // Use a separate axios instance for multipart/form-data (same pattern as advertisements)
    const formApi = axios.create({
      baseURL: API_BASE_URL,
      withCredentials: true,
      timeout: 300000, // 5 minutes for large file uploads
    });
    
    // Add admin token if available
    const token = localStorage.getItem('adminToken');
    if (token) {
      formApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('📸 Added Authorization header');
    }
    
    // Don't set Content-Type - axios will automatically set it with boundary for FormData
    return formApi.post('/shooting-artists', formData, {
      headers: {
        // Explicitly don't set Content-Type - let axios handle it
      },
    })
      .then(response => {
        console.log('✅ Shooting artist created successfully:', response.data);
        return response;
      })
      .catch(error => {
        console.error('❌ Error creating shooting artist:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error response:', error.response?.data);
        console.error('❌ Error status:', error.response?.status);
        console.error('❌ Error config:', error.config?.url, error.config?.method);
        throw error;
      });
  },
  update: (id, formData) => {
    console.log('📸 Updating shooting artist:', id, 'baseURL:', API_BASE_URL);
    
    // Use a separate axios instance for multipart/form-data (same pattern as advertisements)
    const formApi = axios.create({
      baseURL: API_BASE_URL,
      withCredentials: true,
      timeout: 300000, // 5 minutes for large file uploads
    });
    
    // Add admin token if available
    const token = localStorage.getItem('adminToken');
    if (token) {
      formApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    // Don't set Content-Type manually - axios will set it with boundary
    return formApi.put(`/shooting-artists/${id}`, formData)
      .then(response => {
        console.log('✅ Shooting artist updated successfully:', response.data);
        return response;
      })
      .catch(error => {
        console.error('❌ Error updating shooting artist:', error);
        console.error('❌ Error response:', error.response?.data);
        throw error;
      });
  },
  delete: (id) => api.delete(`/shooting-artists/${id}`),
};

// Advertisements / Videos
export const advertisementsAPI = {
  getAll: (params = {}) => {
    const { page = 1, limit = 20, category, isFeatured } = params;
    let url = `/advertisements?page=${page}&limit=${limit}`;
    if (category) url += `&category=${category}`;
    if (isFeatured !== undefined) url += `&isFeatured=${isFeatured}`;
    return api.get(url);
  },
  getById: (id) => api.get(`/advertisements/${id}`),
  create: (formData, onUploadProgress) => {
    // Use a separate axios instance for multipart/form-data
    const formApi = axios.create({
      baseURL: API_BASE_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 600000, // 10 minutes timeout for large video uploads
    });
    
    const token = localStorage.getItem('adminToken');
    if (token) {
      formApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    return formApi.post('/advertisements/create', formData, {
      onUploadProgress: onUploadProgress || (() => {}),
    });
  },
  update: (id, formData, onUploadProgress) => {
    const formApi = axios.create({
      baseURL: API_BASE_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 600000, // 10 minutes timeout for large video uploads
    });
    
    const token = localStorage.getItem('adminToken');
    if (token) {
      formApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    return formApi.put(`/advertisements/${id}`, formData, {
      onUploadProgress: onUploadProgress || (() => {}),
    });
  },
  delete: (id) => api.delete(`/advertisements/${id}`),
};

// Verifications
export const verificationsAPI = {
  getAll: (params = {}) => {
    const { page = 1, limit = 20 } = params;
    return api.get(`/email/verifications?page=${page}&limit=${limit}`);
  },
};

// Sponsors
export const sponsorsAPI = {
  getAll: () => {
    console.log('Calling getAll sponsors...');
    return api.get('/sponsors');
  },
  getById: (id) => api.get(`/sponsors/${id}`),
  create: (sponsorData) => api.post('/sponsors', sponsorData),
  update: (id, sponsorData) => api.put(`/sponsors/${id}`, sponsorData),
  delete: (id) => api.delete(`/sponsors/${id}`),
  bulkImport: (sponsors) => api.post('/sponsors/bulk-import', { sponsors }),
};

// Badge Configurations
export const badgeConfigurationsAPI = {
  getAll: () => {
    console.log('Calling getAll badge configurations...');
    return api.get('/badge-configurations');
  },
  getById: (id) => api.get(`/badge-configurations/${id}`),
  getByFahras: (fahras) => api.get(`/badge-configurations/fahras/${fahras}`),
  create: (configData) => api.post('/badge-configurations', configData),
  update: (id, configData) => api.put(`/badge-configurations/${id}`, configData),
  delete: (id) => api.delete(`/badge-configurations/${id}`),
};

// Reviews and Bug Reports
export const reviewsBugReportsAPI = {
  getAll: (params = {}) => {
    const { type, status, page = 1, limit = 50 } = params;
    let url = `/reviews-bug-reports?page=${page}&limit=${limit}`;
    if (type) url += `&type=${type}`;
    if (status) url += `&status=${status}`;
    return api.get(url);
  },
  getById: (id) => api.get(`/reviews-bug-reports/${id}`),
  update: (id, data) => api.put(`/reviews-bug-reports/${id}`, data),
  delete: (id) => api.delete(`/reviews-bug-reports/${id}`),
  getStats: () => api.get('/reviews-bug-reports/stats/summary'),
};

// Splash Ads
export const splashAdsAPI = {
  getAll: () => {
    console.log('Calling getAll splash ads...');
    return api.get('/splash-ads/all');
  },
  getActive: () => {
    return api.get('/splash-ads');
  },
  create: (formData, onUploadProgress) => {
    const formApi = axios.create({
      baseURL: API_BASE_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutes timeout for image uploads
    });

    const token = localStorage.getItem('adminToken');
    if (token) {
      formApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    return formApi.post('/splash-ads', formData, {
      onUploadProgress: onUploadProgress || (() => { }),
    });
  },
  update: (id, formData, onUploadProgress) => {
    const formApi = axios.create({
      baseURL: API_BASE_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutes timeout for image uploads
    });

    const token = localStorage.getItem('adminToken');
    if (token) {
      formApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    return formApi.put(`/splash-ads/${id}`, formData, {
      onUploadProgress: onUploadProgress || (() => { }),
    });
  },
  delete: (id) => api.delete(`/splash-ads/${id}`),
  toggle: (id) => api.patch(`/splash-ads/${id}/toggle`),
};

// Notifications
export const notificationsAPI = {
  send: (data) => {
    console.log('Sending notification...');
    return api.post('/notifications/send', data);
  },
  sendToUser: (userId, data) => {
    console.log('Sending notification to user:', userId);
    return api.post(`/notifications/send/user/${userId}`, data);
  },
  getStats: () => {
    console.log('Getting notification stats...');
    return api.get('/notifications/stats');
  },
};

// Refunds
export const refundsAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/refunds/all${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id) => {
    return api.get(`/refunds/${id}`);
  },
  approve: (id) => {
    return api.post(`/refunds/${id}/approve`);
  },
  reject: (id, reason) => {
    return api.post(`/refunds/${id}/reject`, { reason });
  },
};

// App Logs
export const logsAPI = {
  getAll: (queryParams = '') => {
    const queryString = queryParams ? (queryParams.startsWith('?') ? queryParams : `?${queryParams}`) : '';
    return api.get(`/logs/all${queryString}`);
  },
  getStats: () => api.get('/logs/stats'),
  deleteLogs: (params) => api.delete('/logs', { params }),
};

export default api;
