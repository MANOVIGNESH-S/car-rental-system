import { useState, useEffect, useCallback } from 'react';
import { getBookingById, cancelBooking as cancelBookingService } from '../services/bookingService';
import { type BookingDetail } from '../../../types/index';

export const useBookingDetail = (bookingId: string) => {
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<boolean>(false);

  const fetchBooking = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getBookingById(bookingId);
      setBooking(data);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to fetch booking details.');
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  const cancel = async (): Promise<void> => {
    setIsCancelling(true);
    setCancelError(null);
    setCancelSuccess(false);

    try {
      await cancelBookingService(bookingId);
      setCancelSuccess(true);
      await fetchBooking(); // Refresh data to show cancelled status
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setCancelError(e.response?.data?.message || 'Failed to cancel booking.');
    } finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId, fetchBooking]);

  return {
    booking,
    isLoading,
    error,
    cancel,
    isCancelling,
    cancelError,
    cancelSuccess,
    refetch: fetchBooking
  };
};