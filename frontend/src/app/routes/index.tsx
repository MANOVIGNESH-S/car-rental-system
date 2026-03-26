// src/app/routes/index.tsx
import React from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { type UserRole } from '../../types';


const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
    <p className="text-gray-600">Coming soon</p>
  </div>
);

const PortalLayout = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Outlet />
    </div>
  </div>
);

const DashboardLayout = () => (
  <div className="min-h-screen bg-gray-50 flex">
    {/* Sidebar placeholder */}
    <div className="w-64 bg-slate-800 text-slate-300 hidden md:block p-4">
      <p className="font-bold text-white mb-6">Staff Dashboard</p>
      <p className="text-sm">Navigation coming soon</p>
    </div>
    <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
      <Outlet />
    </div>
  </div>
);


interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Role-based redirect
    if (user.role === 'Customer') {
      return <Navigate to="/portal" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};


const router = createBrowserRouter([
  // Public Routes
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <PlaceholderPage title="Login" /> },
  { path: '/register', element: <PlaceholderPage title="Register" /> },

  // Customer Portal Routes
  {
    path: '/portal',
    element: <ProtectedRoute allowedRoles={['Customer']} />,
    children: [
      {
        element: <PortalLayout />,
        children: [
          { index: true, element: <PlaceholderPage title="Portal Home" /> },
          { path: 'vehicles', element: <PlaceholderPage title="Vehicles" /> },
          { path: 'vehicles/:id', element: <PlaceholderPage title="Vehicle Details" /> },
          { path: 'bookings', element: <PlaceholderPage title="My Bookings" /> },
          { path: 'bookings/:id', element: <PlaceholderPage title="Booking Details" /> },
          { path: 'kyc', element: <PlaceholderPage title="KYC Verification" /> },
          { path: 'profile', element: <PlaceholderPage title="My Profile" /> },
        ],
      },
    ],
  },

  // Staff Dashboard Routes
  {
    path: '/dashboard',
    element: <ProtectedRoute allowedRoles={['Admin', 'Manager']} />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <PlaceholderPage title="Dashboard Overview" /> },
          { path: 'fleet', element: <PlaceholderPage title="Fleet Management" /> },
          { path: 'bookings', element: <PlaceholderPage title="All Bookings" /> },
          { path: 'damage/:bookingId', element: <PlaceholderPage title="Damage Assessment" /> },
          { path: 'payments/:bookingId', element: <PlaceholderPage title="Payment Ledger" /> },
          { path: 'kyc-review', element: <PlaceholderPage title="KYC Review" /> },
          { path: 'profile', element: <PlaceholderPage title="Staff Profile" /> },
          
          // Admin-only sub-routes
          {
            element: <ProtectedRoute allowedRoles={['Admin']} />,
            children: [
              { path: 'users', element: <PlaceholderPage title="User Management" /> },
              { path: 'jobs', element: <PlaceholderPage title="Background Jobs" /> },
            ],
          },
        ],
      },
    ],
  },

  // Catch-all
  { path: '*', element: <Navigate to="/login" replace /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}