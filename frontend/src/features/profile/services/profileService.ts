import apiClient from '../../../lib/axios';
import type { Profile, UpdateProfileRequest } from '../../../types';

export interface UpdateProfileResponse {
  user_id: string;
  full_name: string;
  phone_number: string;
  updated_at: string;
}

export const getMyProfile = async (): Promise<Profile> => {
  const response = await apiClient.get<Profile>('/users/me');
  return response.data;
};

export const updateMyProfile = async (
  data: UpdateProfileRequest
): Promise<UpdateProfileResponse> => {
  const payload = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );

  const response = await apiClient.patch<UpdateProfileResponse>('/users/me', payload);
  return response.data;
};