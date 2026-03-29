// src/components/layout/DashboardLayout.tsx
import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Truck,
  CalendarDays,
  ShieldCheck,
  CreditCard,
  Users,
  Activity,
  Menu,
  X,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdmin = user?.role === 'Admin';

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', end: true },
    { to: '/dashboard/fleet', icon: Truck, label: 'Fleet' },
    { to: '/dashboard/bookings', icon: CalendarDays, label: 'Bookings' },
    { to: '/dashboard/kyc-review', icon: ShieldCheck, label: 'KYC Review' },
    { to: '/dashboard/payments', icon: CreditCard, label: 'Payments' }, // Links to bookings for now in router
    ...(isAdmin ? [
      { to: '/dashboard/users', icon: Users, label: 'Users' },
      { to: '/dashboard/jobs', icon: Activity, label: 'Jobs' }
    ] : [])
  ];

  const closeSidebar = () => setIsMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 text-slate-300 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-700 bg-slate-900/50">
          <div className="flex flex-col">
            <span className="text-xl font-bold text-white">CarRental</span>
            <span className="text-xs text-slate-400 font-medium tracking-wider">STAFF PORTAL</span>
          </div>
          <button 
            className="ml-auto lg:hidden text-slate-400 hover:text-white"
            onClick={closeSidebar}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700 bg-slate-900/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-4 h-4 text-slate-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-30">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="ml-auto flex items-center gap-4">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              {user?.role}
            </span>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;