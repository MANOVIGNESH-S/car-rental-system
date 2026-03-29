import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../services/authService';
import { type RegisterRequest } from '../../../types';
import { useToast } from '../../../context/ToastContext';

export const useRegister = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const navigate = useNavigate();
  const toast = useToast();

  const register = async (data: RegisterRequest): Promise<void> => {
    setIsLoading(true);

    try {
      await registerUser(data);
      toast.success('Account created!', 'Redirecting to login...');

      // Brief delay so the user can see the success badge/message
      setTimeout(() => {
        navigate('/login');
      }, 1500);
      
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      const errorMessage = e.response?.data?.detail || 'An unexpected error occurred';
      toast.error('Registration failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    register,
    isLoading,
  };
};