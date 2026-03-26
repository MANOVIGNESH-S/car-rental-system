import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { registerUser } from '../services/authService';
import { type RegisterRequest } from '../../../types';

export const useRegister = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  
  const navigate = useNavigate();

  const register = async (data: RegisterRequest): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await registerUser(data);
      setSuccess(true);

      // Brief delay so the user can see the success badge/message
      setTimeout(() => {
        navigate('/login');
      }, 1500);
      
    } catch (err: unknown) {
      let errorMessage = 'Registration failed. Please try again.';

      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          // Handle FastAPI/Pydantic style validation arrays
          errorMessage = detail
            .map((e: { msg: string }) => e.msg)
            .join(', ');
        }
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    register,
    isLoading,
    error,
    success,
  };
};