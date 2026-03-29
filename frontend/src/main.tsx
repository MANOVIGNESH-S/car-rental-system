import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/routes';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Toast } from './components/ui/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary'; // <-- Added import
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        {/* <-- Wrapped RouterProvider in ErrorBoundary --> */}
        <ErrorBoundary>
          <RouterProvider router={router} />
        </ErrorBoundary>
        <Toast />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>
);