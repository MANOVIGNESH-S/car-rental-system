import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const Toast: React.FC = () => {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed z-50 top-4 left-4 right-4 sm:left-auto sm:right-4 flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => {
        const isPersistent = toast.duration === 0;
        
        const Icon = {
          success: CheckCircle2,
          error: XCircle,
          warning: AlertCircle,
          info: Info,
        }[toast.type];

        const styles = {
          success: { border: 'border-l-green-500', icon: 'text-green-600', progress: 'bg-green-500' },
          error: { border: 'border-l-red-500', icon: 'text-red-600', progress: 'bg-red-500' },
          warning: { border: 'border-l-amber-500', icon: 'text-amber-600', progress: 'bg-amber-500' },
          info: { border: 'border-l-blue-500', icon: 'text-blue-600', progress: 'bg-blue-500' },
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-white border border-gray-200 border-l-[4px] ${styles.border} rounded-xl shadow-lg min-w-72 max-w-sm overflow-hidden relative animate-[slide-in-right_0.3s_ease-out]`}
          >
            <div className="p-3 flex items-start gap-3 w-full">
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${styles.icon}`} />
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{toast.title}</p>
                {toast.message && (
                  <p className="text-xs text-gray-500 mt-0.5">{toast.message}</p>
                )}
              </div>
              
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200 rounded"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {!isPersistent && (
              <div
                className={`absolute bottom-0 left-0 h-[2px] ${styles.progress}`}
                style={{
                  width: '100%',
                  animation: `shrink ${toast.duration}ms linear forwards`,
                }}
              />
            )}
          </div>
        );
      })}
      
      {/* Required for the inline dynamic duration animation */}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};