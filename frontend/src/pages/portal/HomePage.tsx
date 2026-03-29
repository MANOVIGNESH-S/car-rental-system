import { useNavigate, Link } from 'react-router-dom';
import { Car, CalendarDays, ShieldCheck, User, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useKYC } from '../../features/kyc/hooks/useKYC';
import { useMyBookings } from '../../features/bookings/hooks/useMyBookings';
import { usePageTitle } from '../../hooks/usePageTitle';
import { KycStatusBanner } from '../../features/kyc/components/KycStatusBanner';
import { Badge } from '../../components/ui/Badge';
import { formatDateTime, getBookingStatusVariant } from '../../utils/vehicleHelpers';
import {type BookingListItem } from '../../types';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { kycStatus, isLoadingStatus } = useKYC();
  const { bookings, isLoading: isLoadingBookings } = useMyBookings();
  usePageTitle('Home');

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const recentBookings = bookings?.slice(0, 3) || [];
  const needsKyc = !isLoadingStatus && kycStatus?.kyc_status !== 'verified';

  const quickActions = [
    { label: 'Browse Vehicles', icon: Car, path: '/portal/vehicles', indicator: false },
    { label: 'My Bookings', icon: CalendarDays, path: '/portal/bookings', indicator: false },
    { label: 'KYC Verification', icon: ShieldCheck, path: '/portal/kyc', indicator: needsKyc },
    { label: 'My Profile', icon: User, path: '/portal/profile', indicator: false },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      
      {/* 1. WELCOME SECTION */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.full_name}!
        </h1>
        <p className="mt-1 text-sm text-gray-500">{currentDate}</p>
      </div>

      {/* 2. KYC BANNER */}
      {!isLoadingStatus && kycStatus?.kyc_status && (
        <KycStatusBanner kycStatus={kycStatus.kyc_status} />
      )}

      {/* 3. QUICK ACTIONS GRID */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          {quickActions.map((action) => (
            <div
              key={action.label}
              onClick={() => navigate(action.path)}
              className="relative bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-3 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              {action.indicator && (
                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-amber-500 rounded-full shadow-sm animate-pulse"></span>
              )}
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <action.icon className="text-blue-600 w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-gray-700 text-center">{action.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. RECENT BOOKINGS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
          {recentBookings.length > 0 && (
            <Link 
              to="/portal/bookings" 
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              View all bookings
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {isLoadingBookings ? (
          <div className="flex items-center justify-center py-12 bg-white border border-gray-200 rounded-xl">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : recentBookings.length > 0 ? (
          <div className="grid gap-4">
            {recentBookings.map((booking: BookingListItem) => (
              <div 
                key={booking.booking_id} 
                className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="hidden sm:flex w-12 h-12 rounded-full bg-gray-50 items-center justify-center shrink-0">
                    <Car className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    {/* Fixed to use vehicle_brand according to your interface */}
                    <h3 className="text-base font-semibold text-gray-900">
                      {booking.vehicle_brand} {booking.vehicle_model}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDateTime(booking.start_time)} — {formatDateTime(booking.end_time)}
                    </p>
                    <div className="mt-2">
                       <Badge variant={getBookingStatusVariant(booking.status)}>
                         {booking.status.replace('_', ' ')}
                       </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0">
                  <span className="text-sm text-gray-500">Total Price</span>
                  <span className="text-lg font-semibold text-gray-900">
                    ${Number(booking.total_price).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-xl shadow-sm">
            <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-5">No bookings yet. Browse vehicles to get started.</p>
            <Link 
              to="/portal/vehicles" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Car className="w-4 h-4" />
              Browse Vehicles
            </Link>
          </div>
        )}
      </div>

    </div>
  );
};

export default HomePage;