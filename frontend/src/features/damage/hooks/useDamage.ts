// src/features/damage/hooks/useDamage.ts

import { useState, useEffect, useCallback } from 'react';
import {
  getDamageLog,
  resolveDamageClaim,
  type DamageLogResponse,
  type DamageResolveResponse,
} from '../services/damageService';

export function useDamage(bookingId: string) {
  const [damageLog, setDamageLog] = useState<DamageLogResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolveResult, setResolveResult] = useState<DamageResolveResponse | null>(null);

  const fetchDamageLog = useCallback(async () => {
    if (!bookingId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDamageLog(bookingId);
      setDamageLog(data);
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'Failed to fetch damage log.');
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (bookingId) {
      fetchDamageLog();
    }
  }, [bookingId, fetchDamageLog]);

  const resolve = useCallback(
    async (decision: 'clear' | 'charge', notes: string, damageAmount?: number) => {
      if (decision === 'charge' && (damageAmount === undefined || damageAmount <= 0)) {
        setResolveError('Damage amount must be greater than 0 when charging the customer.');
        return;
      }

      setIsResolving(true);
      setResolveError(null);
      
      try {
        const data = await resolveDamageClaim(bookingId, {
          decision,
          notes,
          damage_amount: damageAmount,
        });
        setResolveResult(data);
        await fetchDamageLog();
      } catch (err) {
        const e = err as { response?: { data?: { detail?: string } } };
        setResolveError(e.response?.data?.detail || 'Failed to resolve damage claim.');
      } finally {
        setIsResolving(false);
      }
    },
    [bookingId, fetchDamageLog]
  );

  return {
    damageLog,
    isLoading,
    error,
    isResolving,
    resolveError,
    resolveResult,
    fetchDamageLog,
    resolve,
  };
}