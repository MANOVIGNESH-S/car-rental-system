// src/features/bookings/hooks/useAdminBookings.ts

import { useState, useEffect, useCallback } from 'react';
import { getAllBookings, type AdminBookingFilters } from '../services/adminBookingService';
import type { AdminBookingListItem } from '../../../types';

export function useAdminBookings() {
  const [bookings, setBookings] = useState<AdminBookingListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<AdminBookingFilters>({});

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllBookings(filters);
      setBookings(data);
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'Failed to fetch bookings');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const setFilters = useCallback((newFilters: Partial<AdminBookingFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const refetch = useCallback(() => {
    fetchBookings();
  }, [fetchBookings]);

  return {
    bookings,
    isLoading,
    error,
    filters,
    setFilters,
    refetch,
  };
}