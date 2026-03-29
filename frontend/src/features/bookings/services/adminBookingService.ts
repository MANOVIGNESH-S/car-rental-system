// src/features/bookings/services/adminBookingService.ts

import apiClient from '../../../lib/axios';
import type { AdminBookingListItem, BookingStatus } from '../../../types';

export interface AdminBookingFilters {
  branch_tag?: string;
  status?: string;
  vehicle_id?: string;
  date?: string;
  page?: number;
  limit?: number;
}

export interface CheckinResponse {
  booking_id: string;
  status: BookingStatus;
  is_physically_verified: boolean;
  fuel_level_at_pickup: number;
}

export interface CheckoutResponse {
  booking_id: string;
  status: BookingStatus;
  actual_end_time: string;
  damage_job_id: string;
}

export const getAllBookings = async (filters?: AdminBookingFilters): Promise<AdminBookingListItem[]> => {
  const params = filters 
    // The empty space before the comma skips the 'key' variable, resolving the ESLint unused variable warning
    ? Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined))
    : {};

  const response = await apiClient.get<AdminBookingListItem[]>('/admin/bookings', { params });
  return response.data;
};

export const checkinBooking = async (bookingId: string, fuelLevel: number): Promise<CheckinResponse> => {
  const response = await apiClient.patch<CheckinResponse>(`/admin/bookings/${bookingId}/checkin`, {
    fuel_level_at_pickup: fuelLevel,
  });
  return response.data;
};

export const checkoutBooking = async (bookingId: string, fuelLevel: number): Promise<CheckoutResponse> => {
  const response = await apiClient.patch<CheckoutResponse>(`/admin/bookings/${bookingId}/checkout`, {
    fuel_level_at_return: fuelLevel,
  });
  return response.data;
};