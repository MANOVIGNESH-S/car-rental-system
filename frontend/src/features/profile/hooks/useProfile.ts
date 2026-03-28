import { useState, useEffect, useCallback } from 'react';
import { getMyProfile, updateMyProfile, type UpdateProfileResponse } from '../services/profileService';
import { useAuth } from '../../../context/AuthContext';
import type { Profile, UpdateProfileRequest } from '../../../types';

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<boolean>(false);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMyProfile();
      setProfile(data);
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [fetchProfile, user]);

  const updateProfile = async (data: UpdateProfileRequest): Promise<boolean> => {
    const hasValidField = Object.values(data).some(
      (val) => val !== undefined && val !== null && String(val).trim() !== ''
    );

    if (!hasValidField) {
      setUpdateError('Please provide at least one field to update.');
      return false;
    }

    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(false);

    try {
      const response: UpdateProfileResponse = await updateMyProfile(data);
      
      setUpdateSuccess(true);
      setProfile((prevProfile) => {
        if (!prevProfile) return null;
        return {
          ...prevProfile,
          full_name: response.full_name,
          phone_number: response.phone_number,
        };
      });
      return true;
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      setUpdateError(e.response?.data?.detail || 'Failed to update profile');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    profile,
    isLoading,
    error,
    isUpdating,
    updateError,
    updateSuccess,
    updateProfile,
  };
};