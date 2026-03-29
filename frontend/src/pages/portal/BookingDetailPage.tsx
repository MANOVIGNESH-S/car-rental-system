// src/pages/portal/BookingDetailPage.tsx

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
  ExternalLink,
  Camera,
  Upload
} from 'lucide-react';
import { useBookingDetail } from '../../features/bookings/hooks/useBookingDetail';
import { usePageTitle } from '../../hooks/usePageTitle';
import { uploadPostRentalImages } from '../../features/damage/services/damageService';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency, formatDateTime, getBookingStatusVariant } from '../../utils/vehicleHelpers';

const BookingDetailPage = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  // Hook for fetching booking data
  const { 
    booking, 
    isLoading, 
    error, 
    cancel, 
    isCancelling, 
    cancelError 
  } = useBookingDetail(bookingId || '');
  usePageTitle('Booking Details');

  // Local state for Customer Post-Rental Image Upload
  const [postRentalFiles, setPostRentalFiles] = useState<{
    front_exterior?: File; 
    rear_exterior?: File; 
    left_exterior?: File; 
    right_exterior?: File; 
    dashboard?: File;
  }>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

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

  const handleUploadImages = async () => {
    setUploadError('');
    
    // Validate all 5 images are present
    if (!postRentalFiles.front_exterior || !postRentalFiles.rear_exterior || 
        !postRentalFiles.left_exterior || !postRentalFiles.right_exterior || 
        !postRentalFiles.dashboard) {
      setUploadError("Please upload all 5 photos of the vehicle before submitting.");
      return;
    }

    setIsUploading(true);
    try {
      // Safely cast the type to satisfy strict TypeScript rules
      await uploadPostRentalImages(booking.booking_id, postRentalFiles as {
        front_exterior: File;
        rear_exterior: File;
        left_exterior: File;
        right_exterior: File;
        dashboard: File;
      });
      setUploadSuccess(true);
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      setUploadError(e.response?.data?.detail || "Failed to upload images. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
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

          {/* 3. CUSTOMER DROP-OFF IMAGE UPLOAD (ONLY VISIBLE WHEN ACTIVE) */}
          {booking.status === 'active' && (
            <div className="bg-white border border-blue-200 rounded-xl p-4 sm:p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                Ready to Return the Vehicle?
              </h2>
              
              {uploadSuccess ? (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Images Uploaded Successfully!</p>
                    <p className="text-sm text-green-700 mt-1">Please hand the keys back to our staff to complete your check-out.</p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-5">
                    Before returning the keys to our staff, please upload 5 clear photos of the vehicle's current condition to finalize your rental.
                  </p>

                  {uploadError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {uploadError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                    {['front_exterior', 'rear_exterior', 'left_exterior', 'right_exterior', 'dashboard'].map((side) => (
                      <div key={side} className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700 capitalize">{side.replace('_', ' ')}</label>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              setPostRentalFiles(prev => ({ ...prev, [side]: e.target.files![0] }));
                            }
                          }}
                          className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-200 rounded-lg bg-gray-50"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleUploadImages}
                    disabled={isUploading}
                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Submit Drop-off Images
                  </button>
                </>
              )}
            </div>
          )}

          {/* 4. RENTAL INFO CARD */}
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

          {/* 5. PRICE BREAKDOWN CARD */}
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

          {/* 6. PAYMENT HISTORY */}
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