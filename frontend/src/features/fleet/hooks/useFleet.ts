import { useState, useEffect, useCallback } from 'react';
import {
  getFleetVehicles,
  getExpiringDocs,
  deleteVehicle,
  updateVehicleStatus,
 type  ExpiringDocItem,
} from '../services/fleetService';
import type { VehicleListItem, VehicleStatus } from '../../../types/index';

type FleetFilters = {
  branch_tag?: string;
  vehicle_type?: string;
  fuel_type?: string;
  transmission?: string;
};

export function useFleet() {
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [expiringDocs, setExpiringDocs] = useState<ExpiringDocItem[]>([]);
  const [isLoadingExpiry, setIsLoadingExpiry] = useState<boolean>(false);

  const fetchVehicles = useCallback(async (filters?: FleetFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getFleetVehicles(filters);
      setVehicles(data);
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'Failed to fetch vehicles');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchExpiringDocs = useCallback(async (days: number = 30) => {
    setIsLoadingExpiry(true);
    try {
      const data = await getExpiringDocs(days);
      setExpiringDocs(data);
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || 'Failed to fetch expiring documents');
    } finally {
      setIsLoadingExpiry(false);
    }
  }, []);

  // Removed unnecessary try/catch wrappers here to fix TS warnings
  const removeVehicle = useCallback(async (vehicleId: string) => {
    await deleteVehicle(vehicleId);
    setVehicles((prev) => prev.filter((v) => v.vehicle_id !== vehicleId));
  }, []);

  const changeStatus = useCallback(async (vehicleId: string, status: VehicleStatus) => {
    const updatedVehicle = await updateVehicleStatus(vehicleId, status);
    setVehicles((prev) =>
      prev.map((v) =>
        v.vehicle_id === vehicleId
          ? { ...v, vehicle_status: updatedVehicle.vehicle_status }
          : v
      )
    );
  }, []);

  useEffect(() => {
    fetchVehicles();
    fetchExpiringDocs();
  }, [fetchVehicles, fetchExpiringDocs]);

  return {
    vehicles,
    isLoading,
    error,
    expiringDocs,
    isLoadingExpiry,
    fetchVehicles,
    fetchExpiringDocs,
    removeVehicle,
    changeStatus,
  };
}