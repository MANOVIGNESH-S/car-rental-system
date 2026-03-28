import React, { useState } from 'react';
import { Pencil, Trash2, Truck, Check, X, Loader2 } from 'lucide-react';
import type { VehicleListItem, VehicleStatus } from '../../../types/index';
import { getVehicleStatusVariant } from '../../../utils/vehicleHelpers';
import { Badge } from '../../../components/ui/Badge';

export interface FleetTableProps {
  vehicles: VehicleListItem[];
  onEdit: (vehicleId: string) => void;
  onDelete: (vehicleId: string) => void;
  onStatusChange: (vehicleId: string, status: VehicleStatus) => void;
  isLoading: boolean;
}

export function FleetTable({
  vehicles,
  onEdit,
  onDelete,
  onStatusChange,
  isLoading,
}: FleetTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 bg-white border border-gray-200 rounded-xl shadow-sm">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="text-center py-12">
          <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No vehicles found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Vehicle</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Branch</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Rates</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Fuel</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vehicles.map((vehicle) => {
              const statusVariant = getVehicleStatusVariant(vehicle.vehicle_status);
              const fuelColor = 
                vehicle.fuel_level_pct < 20 ? 'bg-red-500' : 
                vehicle.fuel_level_pct < 50 ? 'bg-amber-500' : 'bg-green-500';

              return (
                <tr key={vehicle.vehicle_id} className="hover:bg-gray-50 transition-colors">
                  {/* Vehicle Column */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={vehicle.thumbnail_url || 'https://placehold.co/100x80?text=No+Image'}
                        alt={`${vehicle.brand} ${vehicle.model}`}
                        className="w-12 h-10 rounded object-cover border border-gray-200"
                        loading="lazy"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {vehicle.brand} {vehicle.model}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Type Column */}
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600 capitalize">
                      {vehicle.vehicle_type} • {vehicle.transmission}
                    </p>
                  </td>

                  {/* Branch Column */}
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600">
                      {vehicle.branch_tag}
                    </p>
                  </td>

                  {/* Status Column */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <Badge variant={statusVariant}>
                        {vehicle.vehicle_status.replace('_', ' ')}
                      </Badge>
                      <select
                        value={vehicle.vehicle_status}
                        onChange={(e) => onStatusChange(vehicle.vehicle_id, e.target.value as VehicleStatus)}
                        className="text-xs border border-gray-200 rounded px-1 py-0.5 mt-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="available">Available</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="retired">Retired</option>
                      </select>
                    </div>
                  </td>

                  {/* Rates Column */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-600">₹{vehicle.hourly_rate}/hr</span>
                      <span className="text-xs text-gray-600">₹{vehicle.daily_rate}/day</span>
                    </div>
                  </td>

                  {/* Fuel Column */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${fuelColor}`}
                          style={{ width: `${vehicle.fuel_level_pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{vehicle.fuel_level_pct}%</span>
                    </div>
                  </td>

                  {/* Actions Column */}
                  <td className="px-4 py-3 text-right">
                    {deletingId === vehicle.vehicle_id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-red-600 font-medium mr-1">Confirm?</span>
                        <button
                          onClick={() => {
                            onDelete(vehicle.vehicle_id);
                            setDeletingId(null);
                          }}
                          className="inline-flex items-center justify-center p-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                          title="Yes, delete"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="inline-flex items-center justify-center p-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onEdit(vehicle.vehicle_id)}
                          className="inline-flex items-center justify-center p-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded transition-colors"
                          title="Edit Vehicle"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(vehicle.vehicle_id)}
                          className="inline-flex items-center justify-center p-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                          title="Delete Vehicle"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}