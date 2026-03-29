// src/features/kyc/services/adminKycService.ts

import apiClient from '../../../lib/axios';
import type { AdminUserListItem } from '../../../types';

export interface ReviewKycResponse {
  user_id: string;
  kyc_status: string;
  kyc_verified_at: string | null;
  kyc_reviewed_by: string | null;
}

export const getUsersPendingKyc = async (): Promise<AdminUserListItem[]> => {
  const response = await apiClient.get<AdminUserListItem[]>('/admin/users', {
    params: { kyc_status: 'needs_review' }
  });
  return response.data;
};

export const reviewKyc = async (
  userId: string,
  decision: 'verified' | 'failed',
  reason?: string
): Promise<ReviewKycResponse> => {
  const response = await apiClient.patch<ReviewKycResponse>(`/admin/kyc/${userId}/review`, {
    decision,
    reason,
  });
  return response.data;
};