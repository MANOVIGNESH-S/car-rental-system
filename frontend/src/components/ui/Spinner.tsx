import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  className?: string;
}

export const Spinner = ({ className = 'w-6 h-6' }: SpinnerProps) => {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className={`animate-spin text-blue-600 ${className}`} />
    </div>
  );
};