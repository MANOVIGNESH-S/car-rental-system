import apiClient from '../../../lib/axios';
import { type KYCStatus } from '../../../types';

export interface KYCUploadResponse {
  message: string;
  kyc_status: KYCStatus;
  job_id: string;
}

export interface KYCStatusResponse {
  kyc_status: KYCStatus;
  dl_expiry_date: string | null;
  extracted_address: string | null;
  kyc_verified_at: string | null;
}

export const uploadKYCDocuments = async (
  licenseImage: File,
  selfieImage: File
): Promise<KYCUploadResponse> => {
  const formData = new FormData();
  formData.append('license_image', licenseImage);
  formData.append('selfie_image', selfieImage);

  const response = await apiClient.post<KYCUploadResponse>('/kyc/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const getKYCStatus = async (): Promise<KYCStatusResponse> => {
  const response = await apiClient.get<KYCStatusResponse>('/kyc/status');
  
  return response.data;
};