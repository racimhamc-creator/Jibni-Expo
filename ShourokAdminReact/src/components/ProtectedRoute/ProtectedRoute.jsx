import { Navigate } from 'react-router-dom';
import { ADMIN_SECRET_PATH } from '../../config/routes';

const ProtectedRoute = ({ children }) => {
  const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';
  const adminToken = localStorage.getItem('adminToken');

  if (!isAdminLoggedIn || !adminToken) {
    // Redirect to admin login
    return <Navigate to={`/${ADMIN_SECRET_PATH}/login`} replace />;
  }

  return children;
};

export default ProtectedRoute;
