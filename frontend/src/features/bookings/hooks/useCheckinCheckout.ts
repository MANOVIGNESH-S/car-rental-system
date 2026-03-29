// src/features/bookings/hooks/useCheckinCheckout.ts

import { useState, useCallback } from 'react';
import { 
  checkinBooking, 
  checkoutBooking, 
  type CheckinResponse, 
  type CheckoutResponse 
} from '../services/adminBookingService';
import { 
  uploadPreRentalImages, 
  type DamageUploadFiles 
} from '../../damage/services/damageService';

export function useCheckinCheckout() {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [checkinResult, setCheckinResult] = useState<CheckinResponse | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResponse | null>(null);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setError(null);
    setCheckinResult(null);
    setCheckoutResult(null);
  }, []);

  const checkin = useCallback(async (
    bookingId: string, 
    fuelLevel: number, 
    files: DamageUploadFiles
  ): Promise<void> => {
    if (fuelLevel < 0 || fuelLevel > 100) {
      setError('Fuel level must be between 0 and 100.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Admin still uploads pre-rental images during check-in
      await uploadPreRentalImages(bookingId, files);
      const result = await checkinBooking(bookingId, fuelLevel);
      setCheckinResult(result);
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'Failed to process check-in. Ensure all images are valid.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const checkout = useCallback(async (
    bookingId: string, 
    fuelLevel: number
  ): Promise<void> => {
    if (fuelLevel < 0 || fuelLevel > 100) {
      setError('Fuel level must be between 0 and 100.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // CUSTOMER has already uploaded post-rental images via Portal.
      // Admin simply triggers the final checkout with fuel level.
      const result = await checkoutBooking(bookingId, fuelLevel);
      setCheckoutResult(result);
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'Failed to process check-out.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { checkin, checkout, isProcessing, error, checkinResult, checkoutResult, reset };
}