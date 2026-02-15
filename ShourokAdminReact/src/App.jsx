import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login/Login';
import AdminLogin from './components/AdminLogin/AdminLogin';
import Signup from './components/Signup/Signup';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import Dashboard from './pages/Dashboard/Dashboard';
import Users from './pages/Users/Users';
import Sponsors from './pages/Sponsors/Sponsors';
import Events from './pages/Events/Events';
import Tickets from './pages/Tickets/Tickets';
import Casting from './pages/Casting/Casting';
import FashionGroups from './pages/FashionGroups/FashionGroups';
import ShootingArtists from './pages/ShootingArtists/ShootingArtists';
import Advertisements from './pages/Advertisements/Advertisements';
import SplashAds from './pages/SplashAds/SplashAds';
import Reels from './pages/Reels/Reels';
import ReviewsBugReports from './pages/ReviewsBugReports/ReviewsBugReports';
import Notifications from './pages/Notifications/Notifications';
import Refunds from './pages/Refunds/Refunds';
import Settings from './pages/Settings/Settings';
import AppVersion from './pages/AppVersion/AppVersion';
import AppLogs from './pages/AppLogs/AppLogs';
import Landing from './pages/Landing/Landing';
import PrivacyPolicy from './pages/PrivacyPolicy/PrivacyPolicy';
import DeleteAccount from './pages/DeleteAccount/DeleteAccount';
import Contact from './pages/Contact/Contact';
import Marketing from './pages/Marketing/Marketing';
import CastingForm from './pages/CastingForm/CastingForm';
import Home from './pages/Home/Home';
import ReelsPage from './pages/ReelsPage/ReelsPage';
import EventsList from './pages/EventsList/EventsList';
import EventDetails from './pages/EventDetails/EventDetails';
import PurchaseTickets from './pages/PurchaseTickets/PurchaseTickets';
import PurchaseSuccess from './pages/PurchaseSuccess/PurchaseSuccess';
import TicketDisplay from './pages/TicketDisplay/TicketDisplay';
import Profile from './pages/Profile/Profile';
import { ADMIN_SECRET_PATH, PUBLIC_ROUTES, getAdminPath } from './config/routes';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing Page */}
        <Route path={PUBLIC_ROUTES.LANDING} element={<Landing />} />
        <Route path={PUBLIC_ROUTES.DOWNLOAD} element={<Landing />} />
        
        {/* Public Privacy Policy */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        
        {/* Public Delete Account (Google Play Requirement) */}
        <Route path="/delete-account" element={<DeleteAccount />} />
        
        {/* Public Contact (App Store Requirement) */}
        <Route path={PUBLIC_ROUTES.CONTACT} element={<Contact />} />
        
        {/* Public Marketing (App Store Optional) */}
        <Route path={PUBLIC_ROUTES.MARKETING} element={<Marketing />} />
        
        {/* Public Casting Form */}
        <Route path="/casting/submit" element={<CastingForm />} />
        
        {/* Login Route */}
        <Route path={PUBLIC_ROUTES.LOGIN} element={<Login />} />
        
        {/* Signup Route */}
        <Route path="/signup" element={<Signup />} />

        {/* Home Route - Main app page for logged-in users */}
        <Route path="/home" element={<Home />} />

        {/* Reels Route */}
        <Route path="/reels" element={<ReelsPage />} />

        {/* Events Routes - User-facing */}
        <Route path="/events-list" element={<EventsList />} />
        <Route path="/event/:eventId" element={<EventDetails />} />
        <Route path="/purchase-tickets" element={<PurchaseTickets />} />
        <Route path="/purchase-success" element={<PurchaseSuccess />} />
        <Route path="/ticket/:ticketNumber" element={<TicketDisplay />} />
        <Route path="/profile" element={<Profile />} />

        {/* Dashboard Routes - Protected by secret path AND authentication */}
        <Route path={`/${ADMIN_SECRET_PATH}/login`} element={<AdminLogin />} />
        <Route path={`/${ADMIN_SECRET_PATH}`} element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to={getAdminPath('dashboard')} replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="sponsors" element={<Sponsors />} />
          <Route path="events" element={<Events />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="casting" element={<Casting />} />
          <Route path="fashion-groups" element={<FashionGroups />} />
          <Route path="shooting-artists" element={<ShootingArtists />} />
          <Route path="advertisements" element={<Advertisements />} />
          <Route path="splash-ads" element={<SplashAds />} />
          <Route path="reels" element={<Reels />} />
          <Route path="reviews-bug-reports" element={<ReviewsBugReports />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="refunds" element={<Refunds />} />
          <Route path="app-logs" element={<AppLogs />} />
          <Route path="settings" element={<Settings />} />
          <Route path="app-version" element={<AppVersion />} />
        </Route>

        {/* Redirect old dashboard paths to secret path */}
        <Route path="/dashboard" element={<Navigate to={getAdminPath('dashboard')} replace />} />
        <Route path="/users" element={<Navigate to={getAdminPath('users')} replace />} />
        <Route path="/sponsors" element={<Navigate to={getAdminPath('sponsors')} replace />} />
        <Route path="/events" element={<Navigate to={getAdminPath('events')} replace />} />
        <Route path="/tickets" element={<Navigate to={getAdminPath('tickets')} replace />} />
        <Route path="/casting" element={<Navigate to={getAdminPath('casting')} replace />} />
        <Route path="/advertisements" element={<Navigate to={getAdminPath('advertisements')} replace />} />
        <Route path="/reels" element={<Navigate to={getAdminPath('reels')} replace />} />
        <Route path="/settings" element={<Navigate to={getAdminPath('settings')} replace />} />

        {/* Root redirect to landing page */}
        <Route path="/" element={<Navigate to={PUBLIC_ROUTES.LANDING} replace />} />

        {/* Catch all - redirect to landing */}
        <Route path="*" element={<Navigate to={PUBLIC_ROUTES.LANDING} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
