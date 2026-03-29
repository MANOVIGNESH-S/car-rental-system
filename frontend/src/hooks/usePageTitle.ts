import { useEffect } from 'react';

export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} — CarRental` : 'CarRental';

    return () => {
      // Cleanup: reset to default when component unmounts
      document.title = 'CarRental';
    };
  }, [title]);
}