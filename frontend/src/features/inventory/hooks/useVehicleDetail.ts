import { useState, useEffect, useCallback } from 'react';
import { getVehicleById } from '../services/inventoryService';
import type { VehicleDetail } from '../../../types';
import { isAxiosError } from 'axios'; // <-- Add this import

/**
 * Hook to fetch and manage details for a specific vehicle.
 * Handles the lifecycle of fetching data based on a vehicleId.
 * * @param vehicleId - The unique ID of the vehicle to fetch
 */
export const useVehicleDetail = (vehicleId: string) => {
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

const fetchVehicle = useCallback(async () => {
    if (!vehicleId) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await getVehicleById(vehicleId);
      setVehicle(data);
    } catch (err) { // <-- Remove : any
      if (isAxiosError(err)) { // <-- Safely check if it's an Axios error
        setError(err.response?.data?.message || 'Vehicle not found');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Vehicle not found');
      }
      setVehicle(null);
    } finally {
      setIsLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    fetchVehicle();
  }, [fetchVehicle]);

  return {
    vehicle,
    isLoading,
    error,
    refetch: fetchVehicle,
  };
};