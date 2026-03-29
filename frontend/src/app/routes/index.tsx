import { 
  createBrowserRouter, 
  Navigate, 
  Outlet, 
  useParams,
  useLocation 
} from 'react-router-dom';

import { AuthProvider, useAuth } from '../../context/AuthContext';

import LoginPage from '../../pages/auth/LoginPage';
import RegisterPage from '../../pages/auth/RegisterPage';
import PortalLayout from '../../components/layout/PortalLayout';
import DashboardLayout from '../../components/layout/DashboardLayout';

import HomePage from '../../pages/portal/HomePage';
import KycPage from '../../pages/portal/KycPage';
import ProfilePage from '../../pages/portal/ProfilePage';
import VehicleListPage from '../../pages/portal/VehicleListPage';
import VehicleDetailPage from '../../pages/portal/VehicleDetailPage';
import BookingPage from '../../pages/portal/BookingPage';
import MyBookingsPage from '../../pages/portal/MyBookingsPage';
import BookingDetailPage from '../../pages/portal/BookingDetailPage';

import OverviewPage from '../../pages/dashboard/OverviewPage';
import FleetPage from '../../pages/dashboard/FleetPage';
import BookingsPage from '../../pages/dashboard/BookingsPage';
import DamagePage from '../../pages/dashboard/DamagePage';
import KycReviewPage from '../../pages/dashboard/KycReviewPage';
import UsersPage from '../../pages/dashboard/UsersPage';
import JobsPage from '../../pages/dashboard/JobsPage';
import PaymentsPage from '../../pages/dashboard/PaymentsPage';

import NotFoundPage from '../../pages/NotFoundPage';

export const AdminRoute = () => {
  const { user } = useAuth();
  if (user?.role !== 'Admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
};

export const KycGuard = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (
    user?.kyc_status === 'pending' ||
    user?.kyc_status === 'needs_review' ||
    user?.kyc_status === 'failed'
  ) {
    return <Navigate to="/portal/kyc" state={{ from: location }} replace />;
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
          {
            index: true,
            element: <HomePage />,
          },
          {
            path: 'profile',
            element: <ProfilePage />,
          },
          {
            path: 'kyc',
            element: <KycPage />,
          },
          {
            path: 'vehicles',
            element: <VehicleListPage />,
          },
          {
            path: 'vehicles/:vehicleId',
            element: <VehicleDetailPage />,
          },
          {
            element: <KycGuard />,
            children: [
              {
                path: 'vehicles/:vehicleId/book',
                element: <BookingPage />,
              },
            ],
          },
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
        element: <NotFoundPage />,
      },
    ],
  },
]);