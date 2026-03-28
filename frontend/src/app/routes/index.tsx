import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import LoginPage from '../../pages/auth/LoginPage';
import RegisterPage from '../../pages/auth/RegisterPage';
import PortalLayout from '../../components/layout/PortalLayout';
import DashboardLayout from '../../components/layout/DashboardLayout';

// --- NEW HOME, PROFILE & KYC IMPORTS ---
import HomePage from '../../pages/portal/HomePage';
import KycPage from '../../pages/portal/KycPage';
import ProfilePage from '../../pages/portal/ProfilePage';

// Inventory Imports
import VehicleListPage from '../../pages/portal/VehicleListPage';
import VehicleDetailPage from '../../pages/portal/VehicleDetailPage';

// Booking Imports
import BookingPage from '../../pages/portal/BookingPage';
import MyBookingsPage from '../../pages/portal/MyBookingsPage';
import BookingDetailPage from '../../pages/portal/BookingDetailPage';

const renderPlaceholder = (title: string) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
    <p className="text-sm text-gray-500 mt-2">This page is under construction.</p>
  </div>
);

export const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    ),
    children: [
      {
        path: '/',
        element: <Navigate to="/login" replace />,
      },
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: <RegisterPage />,
      },
      {
        path: '/portal',
        element: <PortalLayout />,
        children: [
          // Set HomePage as the default view when hitting /portal
          {
            index: true,
            element: <HomePage />, 
          },
          // New Profile and KYC routes
          {
            path: 'profile',
            element: <ProfilePage />,
          },
          {
            path: 'kyc',
            element: <KycPage />,
          },
          // Vehicle Routes
          {
            path: 'vehicles',
            element: <VehicleListPage />,
          },
          {
            path: 'vehicles/:vehicleId',
            element: <VehicleDetailPage />,
          },
          {
            path: 'vehicles/:vehicleId/book',
            element: <BookingPage />,
          },
          // Booking Management Routes
          {
            path: 'bookings',
            element: <MyBookingsPage />, 
          },
          {
            path: 'bookings/:bookingId',
            element: <BookingDetailPage />, 
          },
        ],
      },
      {
        path: '/dashboard',
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: renderPlaceholder('Staff Dashboard'),
          },
          {
            path: 'fleet',
            element: renderPlaceholder('Fleet Management'),
          },
        ],
      },
      {
        path: '*',
        element: renderPlaceholder('404 - Not Found'),
      },
    ],
  },
]);