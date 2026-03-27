import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import LoginPage from '../../pages/auth/LoginPage';
import RegisterPage from '../../pages/auth/RegisterPage';
import PortalLayout from '../../components/layout/PortalLayout';
import DashboardLayout from '../../components/layout/DashboardLayout';

// Inventory Imports
import VehicleListPage from '../../pages/portal/VehicleListPage';
import VehicleDetailPage from '../../pages/portal/VehicleDetailPage';

// --- NEW BOOKING IMPORTS ---
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
          {
            index: true,
            element: <Navigate to="/portal/vehicles" replace />,
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
          // --- ADD THIS: The Booking Form Route ---
          {
            path: 'vehicles/:vehicleId/book',
            element: <BookingPage />,
          },
          // Booking Management Routes
          {
            path: 'bookings',
            element: <MyBookingsPage />, // Swapped placeholder for real page
          },
          {
            path: 'bookings/:bookingId',
            element: <BookingDetailPage />, // Added detail view
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