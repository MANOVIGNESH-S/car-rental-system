import { useState, useCallback } from 'react';
// 1. Import functions (Values) normally
import { createVehicle, updateVehicle } from '../services/fleetService';
// 2. Import interfaces/types with 'import type'
import type { CreateVehiclePayload, UpdateVehiclePayload } from '../services/fleetService';
import type { VehicleAdmin } from '../../../types/index';

export function useVehicleForm() {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const resetState = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  const create = useCallback(async (data: CreateVehiclePayload): Promise<VehicleAdmin | null> => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    
    try {
      const result = await createVehicle(data);
      setSuccess(true);
      return result;
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'An error occurred while creating the vehicle');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const update = useCallback(async (
    vehicleId: string, 
    data: UpdateVehiclePayload
  ): Promise<VehicleAdmin | null> => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    
    try {
      const result = await updateVehicle(vehicleId, data);
      setSuccess(true);
      return result;
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'An error occurred while updating the vehicle');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { 
    create, 
    update, 
    isSubmitting, 
    error, 
    success, 
    resetState 
  };
}