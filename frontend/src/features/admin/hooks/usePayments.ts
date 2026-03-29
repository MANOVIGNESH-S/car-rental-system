// src/features/admin/hooks/usePayments.ts

import { useState, useEffect, useCallback } from 'react';
import {
  getPaymentLedger,
  processManualRefund,
  type ManualRefundRequest,
} from '../services/adminService';
import type { PaymentLedger, PaymentRecord } from '../../../types';

export function usePayments(bookingId: string) {
  const [ledger, setLedger] = useState<PaymentLedger | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isRefunding, setIsRefunding] = useState<boolean>(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState<boolean>(false);
  const [refundResult, setRefundResult] = useState<PaymentRecord | null>(null);

  const fetchLedger = useCallback(async () => {
    if (!bookingId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPaymentLedger(bookingId);
      setLedger(data);
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'Failed to fetch payment ledger.');
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (bookingId) {
      fetchLedger();
    }
  }, [bookingId, fetchLedger]);

  const processRefund = useCallback(
    async (data: ManualRefundRequest) => {
      // 1. Validate
      if (data.amount <= 0) {
        setRefundError('Refund amount must be greater than zero.');
        return;
      }
      if (data.reason.trim().length < 5) {
        setRefundError('Reason must be at least 5 characters long.');
        return;
      }

      // 2. Set processing state
      setIsRefunding(true);
      setRefundError(null);
      setRefundSuccess(false);

      try {
        // 3. Call service
        const result = await processManualRefund(data);
        
        // 4. On success
        setRefundSuccess(true);
        setRefundResult(result);
        await fetchLedger();
      } catch (err) {
        // 5. On error
        const e = err as { response?: { data?: { detail?: string } } };
        setRefundError(e.response?.data?.detail || 'Failed to process refund.');
      } finally {
        // 6. Always
        setIsRefunding(false);
      }
    },
    [fetchLedger]
  );

  const resetRefund = useCallback(() => {
    setRefundSuccess(false);
    setRefundResult(null);
    setRefundError(null);
  }, []);

  return {
    ledger,
    isLoading,
    error,
    isRefunding,
    refundError,
    refundSuccess,
    refundResult,
    fetchLedger,
    processRefund,
    resetRefund,
  };
}