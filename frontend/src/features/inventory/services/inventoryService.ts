import apiClient from "../../../lib/axios";
import type { VehicleListItem, VehicleDetail } from "../../../types";

/**
 * Filter criteria for fetching available inventory.
 * All fields are optional and used as query parameters.
 */
export interface InventoryFilters {
  branch_tag?: string;
  start_time?: string;
  end_time?: string;
  vehicle_type?: string;
  fuel_type?: string;
  transmission?: string;
}

/**
 * Fetches a list of vehicles from the inventory based on optional filters.
 * GET /inventory/inventory
 * * @param filters - Optional search and filter parameters
 * @returns A promise resolving to an array of VehicleListItem
 */
export const getInventory = async (
  filters?: InventoryFilters
): Promise<VehicleListItem[]> => {
  const response = await apiClient.get<VehicleListItem[]>("/inventory/inventory", {
    params: filters,
  });
  return response.data;
};

/**
 * Fetches the full details of a specific vehicle.
 * GET /inventory/inventory/:vehicleId
 * * @param vehicleId - The unique identifier of the vehicle
 * @returns A promise resolving to a VehicleDetail object
 */
export const getVehicleById = async (
  vehicleId: string
): Promise<VehicleDetail> => {
  const response = await apiClient.get<VehicleDetail>(
    `/inventory/inventory/${vehicleId}`
  );
  return response.data;
};