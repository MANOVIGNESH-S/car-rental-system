import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  // Note: Adjust destructuring based on your exact AuthContext payload
  const { user, isAuthenticated } = useAuth(); 

  const handleGoHome = (): void => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }
    
    // Route based on role
    // Assuming role strings match standard conventions (customer, admin, manager)
    if (user.role === 'Customer') {
      navigate('/portal');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm max-w-md w-full text-center">
        
        {/* Visual Header */}
        <div className="relative flex justify-center items-center h-32">
          <span className="text-8xl font-bold text-gray-200 absolute select-none tracking-tighter">
            404
          </span>
          <Car className="w-16 h-16 text-gray-400 relative z-10 mt-6" />
        </div>
        
        <h1 className="text-xl font-bold text-gray-900 mt-4">Page not found</h1>
        <p className="text-sm text-gray-500 mt-2 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors w-full sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
          
          <button
            onClick={handleGoHome}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors w-full sm:w-auto"
          >
            <Home className="w-4 h-4" />
            Go home
          </button>
        </div>

      </div>
    </div>
  );
};

export default NotFoundPage;