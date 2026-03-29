import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Loader2, Eye, EyeOff } from 'lucide-react';
import { useRegister } from '../../features/auth/hooks/useRegister';
import { usePageTitle } from '../../hooks/usePageTitle';
import type { RegisterRequest } from '../../types';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<RegisterRequest>({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const { register, isLoading } = useRegister();
  usePageTitle('Create Account');

  const validate = () => {
    const errors: Record<string, string> = {};
    if (formData.full_name.length < 2) errors.full_name = 'Name must be at least 2 characters';
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) errors.email = 'Invalid email address';
    if (formData.phone_number.length < 10) errors.phone_number = 'Enter a valid phone number (min 10 digits)';
    if (formData.password.length < 8) errors.password = 'Password must be at least 8 characters';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation error when user starts typing again
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (validate()) {
      await register(formData);
    }
  };

  const isFormDisabled = isLoading;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <UserPlus className="w-12 h-12 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 text-center mt-4">
            Create account
          </h1>
          <p className="text-sm text-gray-500 text-center mt-1">
            Start renting cars today
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Full name</label>
            <input
              name="full_name"
              type="text"
              required
              disabled={isFormDisabled}
              value={formData.full_name}
              onChange={handleChange}
              placeholder="John Doe"
              className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 disabled:bg-gray-50"
            />
            {validationErrors.full_name && <p className="mt-1 text-xs text-red-600">{validationErrors.full_name}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-500">Email address</label>
            <input
              name="email"
              type="email"
              required
              disabled={isFormDisabled}
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 disabled:bg-gray-50"
            />
            {validationErrors.email && <p className="mt-1 text-xs text-red-600">{validationErrors.email}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-500">Phone number</label>
            <input
              name="phone_number"
              type="tel"
              required
              disabled={isFormDisabled}
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="+91 9876543210"
              className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 disabled:bg-gray-50"
            />
            {validationErrors.phone_number && <p className="mt-1 text-xs text-red-600">{validationErrors.phone_number}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-500">Password</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isFormDisabled}
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-3 py-2 pr-10 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 disabled:bg-gray-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {validationErrors.password && <p className="mt-1 text-xs text-red-600">{validationErrors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={isFormDisabled}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-700">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 underline-offset-2 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;