import { useState, useEffect, useCallback } from 'react';
import { uploadKYCDocuments, getKYCStatus,type KYCStatusResponse } from '../services/kycService';
import { useAuth } from '../../../context/AuthContext';

export const useKYC = () => {
  const { user } = useAuth();
  const [kycStatus, setKycStatus] = useState<KYCStatusResponse | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    setStatusError(null);
    try {
      const data = await getKYCStatus();
      setKycStatus(data);
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      setStatusError(e.response?.data?.detail || 'Failed to fetch KYC status');
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchStatus();
    }
  }, [fetchStatus, user]);

  const upload = async (licenseImage: File, selfieImage: File) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    try {
      await uploadKYCDocuments(licenseImage, selfieImage);
      setUploadSuccess(true);
      await fetchStatus();
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      setUploadError(e.response?.data?.detail || 'Failed to upload KYC documents');
    } finally {
      setIsUploading(false);
    }
  };

  return {
    kycStatus,
    isLoadingStatus,
    isUploading,
    uploadError,
    uploadSuccess,
    statusError,
    fetchStatus,
    upload,
  };
};