import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CalendarDays, CreditCard, Car, ChevronRight } from 'lucide-react';
import { useMyBookings } from '../../features/bookings/hooks/useMyBookings';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency, formatDateTime, getBookingStatusVariant } from '../../utils/vehicleHelpers';

const MyBookingsPage = () => {
  const navigate = useNavigate();
  const { bookings, isLoading, error, statusFilter, setStatusFilter } = useMyBookings();
  usePageTitle('My Bookings');

  const tabs = [
    { id: '', label: 'All' },
    { id: 'reserved', label: 'Reserved' },
    { id: 'active', label: 'Active' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Bookings</h1>

        {/* STATUS FILTER TABS */}
        <div className="mb-6 border-b border-gray-200 overflow-x-auto scrollbar-hide">
          <div className="flex space-x-8 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`pb-4 text-sm transition-colors relative ${
                  statusFilter === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                    : 'text-gray-500 hover:text-gray-700 font-normal'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* LISTING */}
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-xl border border-gray-200">
            <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500 mb-2">No bookings found.</p>
            <Link to="/portal/vehicles" className="text-blue-600 hover:text-blue-700 text-sm font-medium underline underline-offset-4">
              Browse Vehicles
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.booking_id}
                onClick={() => navigate(`/portal/bookings/${booking.booking_id}`)}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-blue-300 transition-all cursor-pointer group"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-20 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Car className="w-8 h-8 text-gray-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900">
                      {booking.vehicle_brand} {booking.vehicle_model || 'Vehicle'}
                    </h3>
                    <div className="mt-1 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <CalendarDays className="w-3.5 h-3.5" />
                        <span>{formatDateTime(booking.start_time)} → {formatDateTime(booking.end_time)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span className="font-medium text-gray-900">{formatCurrency(Number(booking.total_price))}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:border-l sm:pl-4 sm:border-gray-100">
                    <Badge variant={getBookingStatusVariant(booking.status)}>{booking.status}</Badge>
                    <div className="text-blue-600 flex items-center text-sm font-medium">
                      <span className="hidden sm:inline mr-1">View Details</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookingsPage;