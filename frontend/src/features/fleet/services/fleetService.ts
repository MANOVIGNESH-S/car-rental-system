import apiClient from '../../../lib/axios';
import type { 
  VehicleListItem, 
  VehicleStatus, 
  Transmission, 
  FuelType,
  VehicleAdmin 
} from '../../../types/index';

export interface CreateVehiclePayload {
  brand: string;
  model: string;
  vehicle_type: string;
  transmission: Transmission;
  fuel_type: FuelType;
  branch_tag: string;
  hourly_rate: number;
  daily_rate: number;
  security_deposit: number;
  fuel_level_pct: number;
  thumbnail_urls: string[];
  insurance_expiry_date: string;
  rc_expiry_date: string;
  puc_expiry_date: string;
  insurance_url: string;
  rc_url: string;
  puc_url: string;
}

export type UpdateVehiclePayload = Partial<CreateVehiclePayload>;

export interface ExpiringDocItem {
  vehicle_id: string;
  brand: string;
  model: string;
  branch_tag: string;
  expiring: Array<{ doc_type: string; expiry_date: string }>;
}

export const getFleetVehicles = async (filters?: {
  branch_tag?: string;
  vehicle_type?: string;
  fuel_type?: string;
  transmission?: string;
}): Promise<VehicleListItem[]> => {
  const response = await apiClient.get<VehicleListItem[]>('/inventory/inventory', {
    params: filters,
  });
  return response.data;
};

export const getFleetVehicleById = async (vehicleId: string): Promise<VehicleAdmin> => {
  const response = await apiClient.get<VehicleAdmin>(`/inventory/inventory/${vehicleId}`);
  return response.data;
};

export const createVehicle = async (data: CreateVehiclePayload): Promise<VehicleAdmin> => {
  const response = await apiClient.post<VehicleAdmin>('/admin/vehicles', data);
  return response.data;
};

export const updateVehicle = async (
  vehicleId: string,
  data: UpdateVehiclePayload
): Promise<VehicleAdmin> => {
  const response = await apiClient.patch<VehicleAdmin>(`/admin/vehicles/${vehicleId}`, data);
  return response.data;
};

export const deleteVehicle = async (vehicleId: string): Promise<void> => {
  await apiClient.delete(`/admin/vehicles/${vehicleId}`);
};

export const updateVehicleStatus = async (
  vehicleId: string,
  status: VehicleStatus
): Promise<VehicleAdmin> => {
  const response = await apiClient.patch<VehicleAdmin>(`/admin/vehicles/${vehicleId}/status`, {
    vehicle_status: status,
  });
  return response.data;
};

export const getExpiringDocs = async (days?: number): Promise<ExpiringDocItem[]> => {
  const response = await apiClient.get<ExpiringDocItem[]>('/admin/vehicles/expiring-docs', {
    params: { days },
  });
  return response.data;
};