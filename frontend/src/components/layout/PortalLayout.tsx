// src/components/layout/PortalLayout.tsx
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, Car, CalendarDays, ShieldCheck, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const PortalLayout: React.FC = () => {
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/portal', icon: Home, label: 'Home', end: true },
    { to: '/portal/vehicles', icon: Car, label: 'Vehicles' },
    { to: '/portal/bookings', icon: CalendarDays, label: 'Bookings' },
    { to: '/portal/kyc', icon: ShieldCheck, label: 'KYC' },
    { to: '/portal/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Topbar */}
      <header className="bg-white border-b border-gray-200 h-16 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-xl font-bold text-blue-600">CarRental</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-gray-900">{user?.full_name}</span>
              <span className="text-xs text-gray-500">{user?.email}</span>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-16 sm:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 z-40 pb-safe">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default PortalLayout;