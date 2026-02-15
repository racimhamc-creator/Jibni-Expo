// Secret admin path - change this to your own random string
export const ADMIN_SECRET_PATH = '4648494fd8f9dsf4sgfgdsfsdsdf';

// Helper function to get admin routes with secret path
export const getAdminPath = (path = '') => {
  const basePath = `/${ADMIN_SECRET_PATH}`;
  if (path.startsWith('/')) {
    return `${basePath}${path}`;
  }
  return path ? `${basePath}/${path}` : basePath;
};

// Public routes (no secret needed)
export const PUBLIC_ROUTES = {
  LANDING: '/shoroukevent',
  DOWNLOAD: '/khadamatprp',
  LOGIN: '/login',
  PRIVACY_POLICY: '/privacy-policy',
  DELETE_ACCOUNT: '/delete-account',
  CONTACT: '/contact',
  MARKETING: '/marketing',
};

