// src/features/admin/services/adminService.ts

import apiClient from '../../../lib/axios';
import type {
  AdminUserListItem,
  AsyncJob,
  PaymentMethod,
  UserRole,
  JobStatus,
  PaymentLedger,
  PaymentRecord
} from '../../../types';

export interface AdminUsersResponse {
  users: AdminUserListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminJobsResponse {
  jobs: AsyncJob[];
  total: number;
  page: number;
  limit: number;
}

export interface ManualRefundRequest {
  booking_id: string;
  amount: number;
  payment_method: PaymentMethod;
  reason: string;
}

export const getUsers = async (params?: {
  kyc_status?: string;
  role?: string;
  is_suspended?: boolean;
  page?: number;
  limit?: number;
}): Promise<AdminUsersResponse> => {
  const response = await apiClient.get<AdminUsersResponse>('/admin/users', { params });
  return response.data;
};

export const suspendUser = async (
  userId: string,
  isSuspended: boolean
): Promise<{
  user_id: string;
  is_suspended: boolean;
  updated_at: string;
}> => {
  const response = await apiClient.patch<{
    user_id: string;
    is_suspended: boolean;
    updated_at: string;
  }>(`/admin/users/${userId}/suspend`, { is_suspended: isSuspended });
  return response.data;
};

export const updateUserRole = async (
  userId: string,
  role: UserRole
): Promise<{
  user_id: string;
  role: UserRole;
  updated_at: string;
}> => {
  const response = await apiClient.patch<{
    user_id: string;
    role: UserRole;
    updated_at: string;
  }>(`/admin/users/${userId}/role`, { role });
  return response.data;
};

export const getJobs = async (params?: {
  job_type?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<AdminJobsResponse> => {
  const response = await apiClient.get<AdminJobsResponse>('/admin/jobs', { params });
  return response.data;
};

export const retryJob = async (
  jobId: string
): Promise<{
  job_id: string;
  status: JobStatus;
  retry_count: number;
  message: string;
}> => {
  const response = await apiClient.post<{
    job_id: string;
    status: JobStatus;
    retry_count: number;
    message: string;
  }>(`/admin/jobs/${jobId}/retry`);
  return response.data;
};

export const getPaymentLedger = async (
  bookingId: string
): Promise<PaymentLedger> => {
  const response = await apiClient.get<PaymentLedger>(`/bookings/${bookingId}/payments`);
  return response.data;
};

export const processManualRefund = async (
  data: ManualRefundRequest
): Promise<PaymentRecord> => {
  const response = await apiClient.post<PaymentRecord>('/admin/payments/refund', data);
  return response.data;
};