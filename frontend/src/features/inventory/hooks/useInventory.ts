import { useState, useEffect, useCallback } from 'react';
import { getInventory, type InventoryFilters } from '../services/inventoryService';
import type { VehicleListItem } from '../../../types';
import { isAxiosError } from 'axios'; // <-- Add this import
/**
 * Hook to manage inventory data fetching and filtering.
 * Syncs vehicle list with provided filters and handles loading/error states.
 */
export const useInventory = () => {
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<InventoryFilters>({});

const fetchVehicles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getInventory(filters);
      setVehicles(data);
    } catch (err) { // <-- Remove : any
      if (isAxiosError(err)) { // <-- Safely check if it's an Axios error
        setError(err.response?.data?.message || 'Failed to load inventory.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load inventory.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Fetch on mount and whenever filters change
  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  /**
   * Updates filter state by merging new filters with existing ones.
   */
  const setFilters = (newFilters: Partial<InventoryFilters>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...newFilters,
    }));
  };

  /**
   * Manually triggers a refresh of the inventory list.
   */
  const refetch = () => {
    fetchVehicles();
  };

  return {
    vehicles,
    isLoading,
    error,
    filters,
    setFilters,
    refetch,
  };
};