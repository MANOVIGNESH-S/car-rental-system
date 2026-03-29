import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../services/authService';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const { login: contextLogin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);

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
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      const errorMessage = e.response?.data?.detail || 'An unexpected error occurred';
      toast.error('Login failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    login,
    isLoading,
  };
};