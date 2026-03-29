import { useState, useEffect, useCallback } from 'react';
import { uploadKYCDocuments, getKYCStatus,type KYCStatusResponse } from '../services/kycService';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

export const useKYC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [kycStatus, setKycStatus] = useState<KYCStatusResponse | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
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
    try {
      await uploadKYCDocuments(licenseImage, selfieImage);
      toast.success('Documents uploaded', 'Verification in progress.');
      await fetchStatus();
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      const errorMessage = e.response?.data?.detail || 'An unexpected error occurred';
      toast.error('Upload failed', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return {
    kycStatus,
    isLoadingStatus,
    isUploading,
    statusError,
    fetchStatus,
    upload,
  };
};