// src/pages/dashboard/BookingsPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarDays, 
  Search, 
  X, 
  LogIn, 
  LogOut, 
  AlertTriangle, 
  Eye,
  Loader2
} from 'lucide-react';
import { useAdminBookings } from '../../features/bookings/hooks/useAdminBookings';
import { useCheckinCheckout } from '../../features/bookings/hooks/useCheckinCheckout';
import { Badge } from '../../components/ui/Badge';
import { 
  formatCurrency, 
  formatDateTime, 
  getBookingStatusVariant 
} from '../../utils/vehicleHelpers';
import type { AdminBookingListItem } from '../../types';

export default function BookingsPage() {
  const navigate = useNavigate();
  
  // Hooks
  const { 
    bookings, 
    isLoading, 
    error: fetchError, 
    setFilters, 
    refetch 
  } = useAdminBookings();
  
  const { 
    checkin, 
    checkout, 
    isProcessing, 
    error: actionError, 
    checkinResult, 
    checkoutResult,
    reset: resetActionState 
  } = useCheckinCheckout();

  // Local state for filters
  const [localBranch, setLocalBranch] = useState('');
  const [localStatus, setLocalStatus] = useState('');
  const [localDate, setLocalDate] = useState('');

  // Local state for modals
  const [selectedBooking, setSelectedBooking] = useState<AdminBookingListItem | null>(null);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [fuelLevel, setFuelLevel] = useState<number>(100);
  const [checkoutSuccessMsg, setCheckoutSuccessMsg] = useState('');
  
  // Local state for Pre-Rental Image Uploads
  const [formError, setFormError] = useState('');
  const [preRentalFiles, setPreRentalFiles] = useState<{
    front_exterior?: File;
    rear_exterior?: File;
    left_exterior?: File;
    right_exterior?: File;
    dashboard?: File;
  }>({});

  // Filter Actions
  const handleSearch = () => {
    setFilters({
      branch_tag: localBranch || undefined,
      status: localStatus || undefined,
      date: localDate || undefined,
    });
  };

  const handleClear = () => {
    setLocalBranch('');
    setLocalStatus('');
    setLocalDate('');
    setFilters({ branch_tag: undefined, status: undefined, date: undefined });
  };

  // Modal Actions
  const openCheckin = (booking: AdminBookingListItem) => {
    setSelectedBooking(booking);
    setFuelLevel(100);
    setPreRentalFiles({});
    setFormError('');
    resetActionState();
    setIsCheckinModalOpen(true);
  };

  const openCheckout = (booking: AdminBookingListItem) => {
    setSelectedBooking(booking);
    setFuelLevel(100);
    setCheckoutSuccessMsg('');
    resetActionState();
    setIsCheckoutModalOpen(true);
  };

  const closeModals = useCallback(() => {
    setIsCheckinModalOpen(false);
    setIsCheckoutModalOpen(false);
    setSelectedBooking(null);
    setPreRentalFiles({});
    setFormError('');
    resetActionState();
    setCheckoutSuccessMsg('');
  }, [resetActionState]);

const handleConfirmCheckin = async () => {
    if (!selectedBooking) return;
    setFormError('');

    // Ensure all 5 files are present
    if (!preRentalFiles.front_exterior || !preRentalFiles.rear_exterior || 
        !preRentalFiles.left_exterior || !preRentalFiles.right_exterior || 
        !preRentalFiles.dashboard) {
      setFormError("Please upload all 5 pre-rental images before checking in.");
      return;
    }

    // Call checkin with the images, safely casting the type instead of using 'any'
    await checkin(selectedBooking.booking_id, fuelLevel, preRentalFiles as {
      front_exterior: File;
      rear_exterior: File;
      left_exterior: File;
      right_exterior: File;
      dashboard: File;
    });
    
    refetch();
  };

  const handleConfirmCheckout = async () => {
    if (!selectedBooking) return;
    await checkout(selectedBooking.booking_id, fuelLevel);
    refetch();
  };

  // Auto-close / success message handlers based on hook results
  useEffect(() => {
    if (checkinResult) {
      const timer = setTimeout(() => {
        closeModals();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [checkinResult, closeModals]);

  useEffect(() => {
    if (checkoutResult) {
      const initTimer = setTimeout(() => {
        setCheckoutSuccessMsg('Checkout completed successfully!');
      }, 0);
      
      const closeTimer = setTimeout(() => {
        closeModals();
      }, 2000);
      
      return () => {
        clearTimeout(initTimer);
        clearTimeout(closeTimer);
      };
    }
  }, [checkoutResult, closeModals]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. PAGE HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage all vehicle bookings</p>
      </div>

      {/* 2. FILTER BAR */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Branch Tag</label>
            <input 
              type="text" 
              placeholder="e.g. BLR-01"
              value={localBranch}
              onChange={(e) => setLocalBranch(e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select
              value={localStatus}
              onChange={(e) => setLocalStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="reserved">Reserved</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
            <input 
              type="date" 
              value={localDate}
              onChange={(e) => setLocalDate(e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSearch}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
          <button 
            onClick={handleClear}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {fetchError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{fetchError}</p>
        </div>
      )}

      {/* 3. BOOKINGS TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No bookings found.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-xs uppercase text-gray-500 font-medium">Customer</th>
                  <th className="px-6 py-3 text-xs uppercase text-gray-500 font-medium">Vehicle</th>
                  <th className="px-6 py-3 text-xs uppercase text-gray-500 font-medium">Branch</th>
                  <th className="px-6 py-3 text-xs uppercase text-gray-500 font-medium">Period</th>
                  <th className="px-6 py-3 text-xs uppercase text-gray-500 font-medium">Amount</th>
                  <th className="px-6 py-3 text-xs uppercase text-gray-500 font-medium">Status</th>
                  <th className="px-6 py-3 text-xs uppercase text-gray-500 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <tr key={booking.booking_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900">{booking.user_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{booking.user_phone || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">{booking.vehicle_brand} {booking.vehicle_model}</p>
                      <p className="text-xs text-gray-400 mt-0.5">ID: {booking.vehicle_id.substring(0, 8)}...</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="neutral">{booking.branch_tag}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-start gap-2">
                        <CalendarDays className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div className="text-xs text-gray-700 flex flex-col space-y-1">
                          <span>{formatDateTime(booking.start_time)}</span>
                          <span className="text-gray-400">→ {formatDateTime(booking.end_time)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {formatCurrency(booking.total_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant={getBookingStatusVariant(booking.status)}>
                          {booking.status}
                        </Badge>
                        {booking.is_physically_verified && (
                          <span className="text-[10px] text-green-600 font-medium">Verified</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {booking.status === 'reserved' && (
                          <button
                            onClick={() => openCheckin(booking)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            <LogIn className="w-4 h-4" />
                            Check In
                          </button>
                        )}
                        {booking.status === 'active' && (
                          <button
                            onClick={() => openCheckout(booking)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Check Out
                          </button>
                        )}
                        {booking.status === 'completed' && (
                          <button
                            onClick={() => navigate(`/dashboard/damage/${booking.booking_id}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg border border-gray-200 transition-colors"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            View Damage
                          </button>
                        )}
                        
                        <button
                          onClick={() => navigate(`/dashboard/bookings/${booking.booking_id}`)}
                          className="inline-flex items-center justify-center p-1.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg border border-gray-200 transition-colors"
                          title="Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 4. CHECKIN MODAL */}
      {isCheckinModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Vehicle Check-In</h2>
              <button onClick={closeModals} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 mb-6 text-sm">
              <p><span className="text-gray-500 font-medium">Customer:</span> {selectedBooking.user_name}</p>
              <p><span className="text-gray-500 font-medium">Vehicle:</span> {selectedBooking.vehicle_brand} {selectedBooking.vehicle_model}</p>
            </div>

            {(actionError || formError) && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {actionError || formError}
              </div>
            )}

            <div className="space-y-4 mb-6">
              
              {/* IMAGE UPLOAD SECTION */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Pre-Rental Images (Required)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {['front_exterior', 'rear_exterior', 'left_exterior', 'right_exterior', 'dashboard'].map((side) => (
                    <div key={side}>
                      <label className="block text-gray-500 capitalize mb-1">{side.replace('_', ' ')}</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setPreRentalFiles(prev => ({ ...prev, [side]: e.target.files![0] }));
                          }
                        }}
                        className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fuel Level at Pickup</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={fuelLevel}
                    onChange={(e) => setFuelLevel(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex items-center relative w-20 shrink-0">
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={fuelLevel}
                      onChange={(e) => setFuelLevel(Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-6"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg border border-blue-100 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>This will mark the booking as Active and allow the customer to take the vehicle.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button 
                onClick={closeModals}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmCheckin}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Check-In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CHECKOUT MODAL */}
      {isCheckoutModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Vehicle Check-Out</h2>
              {!checkoutSuccessMsg && (
                <button onClick={closeModals} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {checkoutSuccessMsg ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LogOut className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Check-Out Complete</h3>
                <p className="text-sm text-gray-500">{checkoutSuccessMsg}</p>
              </div>
            ) : (
              <>
                <div className="bg-gray-50 rounded-lg p-3 mb-6 text-sm">
                  <p><span className="text-gray-500 font-medium">Customer:</span> {selectedBooking.user_name}</p>
                  <p><span className="text-gray-500 font-medium">Vehicle:</span> {selectedBooking.vehicle_brand} {selectedBooking.vehicle_model}</p>
                </div>

                {actionError && (
                  <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                    {actionError}
                  </div>
                )}

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fuel Level at Return</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={fuelLevel}
                        onChange={(e) => setFuelLevel(Number(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                      <div className="flex items-center relative w-20 shrink-0">
                        <input 
                          type="number"
                          min="0"
                          max="100"
                          value={fuelLevel}
                          onChange={(e) => setFuelLevel(Number(e.target.value))}
                          className="w-full px-2 py-1.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent pr-6"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>This will complete the booking and trigger damage assessment logic.</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button 
                    onClick={closeModals}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmCheckout}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirm Check-Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}