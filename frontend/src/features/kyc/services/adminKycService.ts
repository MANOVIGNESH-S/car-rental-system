import apiClient from '../../../lib/axios';
import type { AdminUserListItem } from '../../../types';

export interface ReviewKycResponse {
  user_id: string;
  kyc_status: string;
  kyc_verified_at: string | null;
  kyc_reviewed_by: string | null;
}

interface AdminUserListResponse {
  users: AdminUserListItem[];
  total: number;
  page: number;
  limit: number;
}

export const getUsersPendingKyc = async (): Promise<AdminUserListResponse> => {
  const response = await apiClient.get<AdminUserListResponse>('/admin/users', {
    params: { kyc_status: 'needs_review' }
  });
  return response.data;
};

export interface KycDocumentUrls {
  license_url: string | null;
  selfie_url: string | null;
}

export const getKycDocumentUrls = async (userId: string): Promise<KycDocumentUrls> => {
  const response = await apiClient.get<KycDocumentUrls>(`/admin/kyc/${userId}/documents`);
  return response.data;
};

export const reviewKyc = async (
  userId: string,
  decision: 'verified' | 'failed',
  reason?: string
): Promise<ReviewKycResponse> => {
  const response = await apiClient.patch<ReviewKycResponse>(
    `/admin/kyc/${userId}/review`,
    { decision, reason }
  );
  return response.data;
};