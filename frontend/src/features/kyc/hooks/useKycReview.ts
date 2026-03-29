// src/features/kyc/hooks/useKycReview.ts

import { useState, useEffect, useCallback } from 'react';
import { getUsersPendingKyc, reviewKyc } from '../services/adminKycService';
import type { AdminUserListItem } from '../../../types';

export function useKycReview() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const responseData = await getUsersPendingKyc();
      
      // FIX: Extract the actual array from the backend response object
      // This handles standard FastAPI pagination or wrapper objects safely without TS 'any' errors
      if (Array.isArray(responseData)) {
        setUsers(responseData);
      } else if (responseData && typeof responseData === 'object') {
        // Cast to check common wrapper properties
        const wrappedData = responseData as { items?: AdminUserListItem[]; data?: AdminUserListItem[] };
        
        if (wrappedData.items && Array.isArray(wrappedData.items)) {
          setUsers(wrappedData.items);
        } else if (wrappedData.data && Array.isArray(wrappedData.data)) {
          setUsers(wrappedData.data);
        } else {
          setUsers([]); // Fallback to prevent crashes if structure is totally different
        }
      } else {
        setUsers([]);
      }
      
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'Failed to fetch pending KYC reviews.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const review = useCallback(async (userId: string, decision: 'verified' | 'failed', reason?: string) => {
    setIsReviewing(true);
    setReviewError(null);
    try {
      await reviewKyc(userId, decision, reason);
      
      // Safely cast the user object to check for either user_id or id
      setUsers((prev) => {
        // Extra safety check in case prev isn't an array
        if (!Array.isArray(prev)) return [];
        
        return prev.filter((u) => {
          const user = u as unknown as { user_id?: string; id?: string };
          return (user.user_id || user.id) !== userId;
        });
      });
      
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      setReviewError(e.response?.data?.detail || 'Failed to process KYC review.');
      throw err;
    } finally {
      setIsReviewing(false);
    }
  }, []);

  return {
    users,
    isLoading,
    error,
    isReviewing,
    reviewError,
    fetchUsers,
    review
  };
}