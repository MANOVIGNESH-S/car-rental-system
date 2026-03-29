import { createBrowserRouter, Navigate, Outlet, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import LoginPage from '../../pages/auth/LoginPage';
import RegisterPage from '../../pages/auth/RegisterPage';
import PortalLayout from '../../components/layout/PortalLayout';
import DashboardLayout from '../../components/layout/DashboardLayout';

// --- PORTAL IMPORTS ---
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

// --- DASHBOARD IMPORTS ---
import OverviewPage from '../../pages/dashboard/OverviewPage';
import FleetPage from '../../pages/dashboard/FleetPage';
import BookingsPage from '../../pages/dashboard/BookingsPage';
import DamagePage from '../../pages/dashboard/DamagePage';
import KycReviewPage from '../../pages/dashboard/KycReviewPage';
import UsersPage from '../../pages/dashboard/UsersPage';
import JobsPage from '../../pages/dashboard/JobsPage';
import PaymentsPage from '../../pages/dashboard/PaymentsPage';

const renderPlaceholder = (title: string) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
    <p className="text-sm text-gray-500 mt-2">This page is under construction.</p>
  </div>
);

// --- NEW COMPONENTS ---
export const AdminRoute = () => {
  const { user } = useAuth();
  
  if (user?.role !== 'Admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Outlet />;
};


export const BookingStaffDetailPage = () => {
  const { booking_id } = useParams<{ booking_id: string }>();
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
      <p className="mt-2 text-sm text-gray-500">Booking ID: {booking_id}</p>
    </div>
  );
};


// eslint-disable-next-line react-refresh/only-export-components
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
          // Profile and KYC routes
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
            element: <OverviewPage />,
          },
          {
            path: 'fleet',
            element: <FleetPage />,
          },
          {
            path: 'bookings',
            element: <BookingsPage />,
          },
          {
            path: 'bookings/:booking_id',
            element: <BookingStaffDetailPage />,
          },
          {
            path: 'payments/:bookingId',
            element: <PaymentsPage />,
          },
          {
            path: 'damage/:bookingId',
            element: <DamagePage />,
          },
          {
            path: 'kyc-review',
            element: <KycReviewPage />,
          },
          // Admin Only Routes
          {
            element: <AdminRoute />,
            children: [
              {
                path: 'users',
                element: <UsersPage />,
              },
              {
                path: 'jobs',
                element: <JobsPage />,
              },
            ],
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