import apiClient from '../../../lib/axios';
import type { 
  VehicleListItem, 
  VehicleStatus, 
  Transmission, 
  FuelType,
  VehicleAdmin 
} from '../../../types/index';

// ✅ UPDATED CreateVehiclePayload (uses files instead of URLs)
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
  vehicle_images: File[];
  insurance_doc: File;
  rc_doc: File;
  puc_doc: File;
}

// ✅ UPDATED UpdateVehiclePayload (no file fields)
export interface UpdateVehiclePayload {
  branch_tag?: string;
  hourly_rate?: number;
  daily_rate?: number;
  security_deposit?: number;
  fuel_level_pct?: number;
}

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

// ✅ UPDATED createVehicle (multipart/form-data)
export const createVehicle = async (data: CreateVehiclePayload): Promise<VehicleAdmin> => {
  const formData = new FormData();

  formData.append('brand', data.brand);
  formData.append('model', data.model);
  formData.append('vehicle_type', data.vehicle_type);
  formData.append('transmission', data.transmission);
  formData.append('fuel_type', data.fuel_type);
  formData.append('branch_tag', data.branch_tag);
  formData.append('hourly_rate', String(data.hourly_rate));
  formData.append('daily_rate', String(data.daily_rate));
  formData.append('security_deposit', String(data.security_deposit));
  formData.append('fuel_level_pct', String(data.fuel_level_pct));

  // Multiple images
  data.vehicle_images.forEach((img) => {
    formData.append('vehicle_images', img);
  });

  formData.append('insurance_doc', data.insurance_doc);
  formData.append('rc_doc', data.rc_doc);
  formData.append('puc_doc', data.puc_doc);

  const response = await apiClient.post<VehicleAdmin>(
    '/admin/vehicles',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );

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
  const response = await apiClient.patch<VehicleAdmin>(
    `/admin/vehicles/${vehicleId}/status`,
    {
      vehicle_status: status,
    }
  );
  return response.data;
};

export const getExpiringDocs = async (days?: number): Promise<ExpiringDocItem[]> => {
  const response = await apiClient.get<ExpiringDocItem[]>(
    '/admin/vehicles/expiring-docs',
    {
      params: { days },
    }
  );
  return response.data;
};