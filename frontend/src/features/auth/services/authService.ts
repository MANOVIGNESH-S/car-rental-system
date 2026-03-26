import apiClient from '../../../lib/axios';
import type { 
  User, 
  LoginRequest, 
  RegisterRequest 
} from '../../../types';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

/**
 * authenticates a user using OAuth2PasswordRequestForm compatible format
 * (x-www-form-urlencoded) as required by the backend.
 */
export const loginUser = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const body = new URLSearchParams();
  body.append('username', credentials.username);
  body.append('password', credentials.password);

  const { data } = await apiClient.post<LoginResponse>('/auth/login', body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return data;
};

/**
 * Registers a new customer account.
 */
export const registerUser = async (payload: RegisterRequest): Promise<User> => {
  const { data } = await apiClient.post<User>('/auth/register', payload);
  return data;
};

/**
 * Invalidates the current session on the server.
 */
export const logoutUser = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};