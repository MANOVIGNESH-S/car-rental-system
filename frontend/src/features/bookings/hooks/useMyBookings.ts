import { useState, useEffect, useCallback } from 'react';
import { getMyBookings } from '../services/bookingService';
import { type BookingListItem } from '../../../types/index';

export const useMyBookings = () => {
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMyBookings({
        status: statusFilter !== '' ? statusFilter : undefined,
      });
      setBookings(data);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to load bookings. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return {
    bookings,
    isLoading,
    error,
    statusFilter,
    setStatusFilter,
    refetch: fetchBookings,
  };
};