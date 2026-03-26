import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loginUser } from '../services/authService';
import { useAuth } from '../../../context/AuthContext';

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login: contextLogin } = useAuth();
  const navigate = useNavigate();

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await loginUser({ username: email, password });
      
      // Update global AuthContext state and persist token
      contextLogin(data.user, data.access_token);

      // Role-based redirection logic using raw strings since UserRole is a type, not an enum
      if (data.user.role === 'Customer') {
        navigate('/portal');
      } else if (
        data.user.role === 'Manager' || 
        data.user.role === 'Admin'
      ) {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      let errorMessage = 'Invalid email or password';

      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        }
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    login,
    isLoading,
    error,
  };
};