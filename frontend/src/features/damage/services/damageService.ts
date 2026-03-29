// src/features/damage/services/damageService.ts

import apiClient from '../../../lib/axios';
import type { DamageClassification } from '../../../types';

export interface DamageUploadResponse {
  booking_id: string;
  image_type: 'pre_rental' | 'post_rental';
  uploaded_urls: string[];
  uploaded_at: string;
}

export interface DamageLogResponse {
  log_id: string;
  booking_id: string;
  pre_rental_image_urls: string[] | null;
  post_rental_image_urls: string[] | null;
  fuel_level_at_pickup: number | null;
  fuel_level_at_return: number | null;
  llm_classification: DamageClassification | null;
  created_at: string;
  damage_job: Record<string, unknown> | null;
}

export interface DamageResolveResponse {
  booking_id: string;
  resolution: string;
  damage_amount: string | null;
  refund_amount: string | null;
  payment_records_created: string[];
}

export interface DamageUploadFiles {
  front_exterior: File;
  rear_exterior: File;
  left_exterior: File;
  right_exterior: File;
  dashboard: File;
}

export interface DamageResolveData {
  decision: 'clear' | 'charge';
  damage_amount?: number;
  notes: string;
}

export const uploadPreRentalImages = async (
  bookingId: string,
  files: DamageUploadFiles
): Promise<DamageUploadResponse> => {
  const formData = new FormData();
  formData.append('front_exterior', files.front_exterior);
  formData.append('rear_exterior', files.rear_exterior);
  formData.append('left_exterior', files.left_exterior);
  formData.append('right_exterior', files.right_exterior);
  formData.append('dashboard', files.dashboard);

  const response = await apiClient.post<DamageUploadResponse>(
    `/bookings/${bookingId}/damage/pre`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

export const uploadPostRentalImages = async (
  bookingId: string,
  files: DamageUploadFiles
): Promise<DamageUploadResponse> => {
  const formData = new FormData();
  formData.append('front_exterior', files.front_exterior);
  formData.append('rear_exterior', files.rear_exterior);
  formData.append('left_exterior', files.left_exterior);
  formData.append('right_exterior', files.right_exterior);
  formData.append('dashboard', files.dashboard);

  const response = await apiClient.post<DamageUploadResponse>(
    `/bookings/${bookingId}/damage/post`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

export const getDamageLog = async (bookingId: string): Promise<DamageLogResponse> => {
  const response = await apiClient.get<DamageLogResponse>(`/admin/damage/${bookingId}`);
  return response.data;
};

export const resolveDamageClaim = async (
  bookingId: string,
  data: DamageResolveData
): Promise<DamageResolveResponse> => {
  const response = await apiClient.patch<DamageResolveResponse>(
    `/admin/damage/${bookingId}/resolve`,
    data
  );
  return response.data;
};