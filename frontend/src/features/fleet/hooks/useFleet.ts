import { useState, useEffect, useCallback } from 'react';
import {
  getFleetVehicles,
  getExpiringDocs,
  deleteVehicle,
  updateVehicleStatus,
 type  ExpiringDocItem,
} from '../services/fleetService';
import type { VehicleListItem, VehicleStatus } from '../../../types/index';
import { useToast } from '../../../context/ToastContext';

type FleetFilters = {
  branch_tag?: string;
  vehicle_type?: string;
  fuel_type?: string;
  transmission?: string;
};

export function useFleet() {
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const toast = useToast();
  
  const [expiringDocs, setExpiringDocs] = useState<ExpiringDocItem[]>([]);
  const [isLoadingExpiry, setIsLoadingExpiry] = useState<boolean>(false);

  const fetchVehicles = useCallback(async (filters?: FleetFilters) => {
    setIsLoading(true);
    try {
      const data = await getFleetVehicles(filters);
      setVehicles(data);
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      const errorMessage = e.response?.data?.detail || 'An unexpected error occurred';
      toast.error('Action failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchExpiringDocs = useCallback(async (days: number = 30) => {
    setIsLoadingExpiry(true);
    try {
      const data = await getExpiringDocs(days);
      setExpiringDocs(data);
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      const errorMessage = e.response?.data?.detail || 'An unexpected error occurred';
      toast.error('Action failed', errorMessage);
    } finally {
      setIsLoadingExpiry(false);
    }
  }, [toast]);

  const removeVehicle = useCallback(async (vehicleId: string) => {
    try {
      await deleteVehicle(vehicleId);
      setVehicles((prev) => prev.filter((v) => v.vehicle_id !== vehicleId));
      toast.success('Vehicle deleted');
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      const errorMessage = e.response?.data?.detail || 'An unexpected error occurred';
      toast.error('Action failed', errorMessage);
    }
  }, [toast]);

  const changeStatus = useCallback(async (vehicleId: string, status: VehicleStatus) => {
    try {
      const updatedVehicle = await updateVehicleStatus(vehicleId, status);
      setVehicles((prev) =>
        prev.map((v) =>
          v.vehicle_id === vehicleId
            ? { ...v, vehicle_status: updatedVehicle.vehicle_status }
            : v
        )
      );
      toast.success('Status updated');
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      const errorMessage = e.response?.data?.detail || 'An unexpected error occurred';
      toast.error('Action failed', errorMessage);
    }
  }, [toast]);

  useEffect(() => {
    fetchVehicles();
    fetchExpiringDocs();
  }, [fetchVehicles, fetchExpiringDocs]);

  return {
    vehicles,
    isLoading,
    expiringDocs,
    isLoadingExpiry,
    fetchVehicles,
    fetchExpiringDocs,
    removeVehicle,
    changeStatus,
  };
}