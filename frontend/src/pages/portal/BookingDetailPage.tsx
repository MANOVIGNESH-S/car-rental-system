import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CalendarDays, 
  Car, 
  CheckCircle2, 
  CreditCard, 
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useBookingDetail } from '../../features/bookings/hooks/useBookingDetail';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency, formatDateTime, getBookingStatusVariant } from '../../utils/vehicleHelpers';

const BookingDetailPage = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  const { 
    booking, 
    isLoading, 
    error, 
    cancel, 
    isCancelling, 
    cancelError 
  } = useBookingDetail(bookingId || '');

  if (isLoading) return <Spinner />;

  if (error || !booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-4">
          <p className="text-sm text-red-700">{error || 'Booking not found'}</p>
        </div>
        <button onClick={() => navigate('/portal/bookings')} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to My Bookings
        </button>
      </div>
    );
  }

  const handleCancel = async () => {
    await cancel();
    setShowConfirmCancel(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* 1. HEADER */}
        <div className="mb-6">
          <Link to="/portal/bookings" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to My Bookings
          </Link>
          <div className="flex items-baseline justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
            <span className="text-xs font-mono text-gray-400">#{booking.booking_id.slice(0, 8)}</span>
          </div>
        </div>

        <div className="space-y-6">
          {/* 2. STATUS CARD */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">Current Status:</span>
                <Badge variant={getBookingStatusVariant(booking.status)} className="text-sm px-3 py-1">
                  {booking.status.toUpperCase()}
                </Badge>
              </div>

              {booking.status === 'reserved' && !showConfirmCancel && (
                <button 
                  onClick={() => setShowConfirmCancel(true)}
                  className="inline-flex items-center justify-center px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
                >
                  Cancel Booking
                </button>
              )}
            </div>

            {showConfirmCancel && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <p className="text-sm text-amber-800 font-medium mb-3">Are you sure you want to cancel this booking?</p>
                <div className="flex gap-3">
                  <button 
                    onClick={handleCancel}
                    disabled={isCancelling}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    {isCancelling && <Loader2 className="w-3 h-3 animate-spin" />}
                    Yes, cancel
                  </button>
                  <button 
                    onClick={() => setShowConfirmCancel(false)}
                    disabled={isCancelling}
                    className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Keep booking
                  </button>
                </div>
              </div>
            )}

            {cancelError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4" />
                {cancelError}
              </div>
            )}
          </div>

          {/* 3. BOOKING INFO CARD */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Rental Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CalendarDays className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Pickup</p>
                    <p className="text-sm font-medium text-gray-900">{formatDateTime(booking.start_time)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarDays className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Return</p>
                    <p className="text-sm font-medium text-gray-900">{formatDateTime(booking.end_time)}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Car className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Vehicle</p>
                    <Link 
                      to={`/portal/vehicles/${booking.vehicle_id}`}
                      className="text-sm font-medium text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      ID: {booking.vehicle_id.slice(0, 8)}... <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className={`w-5 h-5 mt-0.5 ${booking.is_physically_verified ? 'text-green-600' : 'text-amber-500'}`} />
                  <div>
                    <p className="text-xs text-gray-500">Verification</p>
                    <p className="text-sm font-medium text-gray-900">
                      {booking.is_physically_verified ? 'Physically Verified' : 'Pending Verification'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. PRICE BREAKDOWN CARD */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Payment Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Rental Fee</span>
                <span className="text-gray-900">{formatCurrency(Number(booking.rental_fee))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Security Deposit</span>
                <span className="text-gray-900">{formatCurrency(Number(booking.security_deposit))}</span>
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-base font-semibold text-gray-900">Total Price</span>
                <span className="text-lg font-bold text-blue-600">{formatCurrency(Number(booking.total_price))}</span>
              </div>
            </div>
          </div>

          {/* 5. PAYMENT HISTORY */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-400" /> Payment Records
            </h2>
            <div className="space-y-4">
              {!booking.payments || booking.payments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4 italic">No payment records yet</p>
              ) : (
                booking.payments.map((payment, idx) => (
                  <div key={payment.payment_id || idx} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Badge variant="neutral" className="capitalize text-[10px]">
                          {payment.transaction_type}
                        </Badge>
                        <span className="text-sm font-medium text-gray-700">{payment.payment_method}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(Number(payment.amount))}</span>
                        <Badge variant={payment.status === 'completed' ? 'success' : 'warning'}>
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Ref: {payment.mock_transaction_id || payment.payment_id.slice(0, 12)}</span>
                      <span>{formatDateTime(payment.timestamp)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailPage;