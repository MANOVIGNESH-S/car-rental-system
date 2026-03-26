import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import LoginPage from '../../pages/auth/LoginPage';
import RegisterPage from '../../pages/auth/RegisterPage';
import PortalLayout from '../../components/layout/PortalLayout';
import DashboardLayout from '../../components/layout/DashboardLayout';

// Lowercase function returning JSX is fine for Fast Refresh
const renderPlaceholder = (title: string) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
    <p className="text-sm text-gray-500 mt-2">This page is under construction.</p>
  </div>
);

export const router = createBrowserRouter([
  {
    // Inline the wrapper directly here to avoid Fast Refresh component warnings
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
            element: renderPlaceholder('Customer Portal'),
          },
          {
            path: 'bookings',
            element: renderPlaceholder('My Bookings'),
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