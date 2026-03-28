import { Car, Droplets, MapPin } from 'lucide-react';
import type { VehicleListItem } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { 
  getVehicleStatusVariant, 
  formatCurrency 
} from '../../../utils/vehicleHelpers';

interface VehicleCardProps {
  vehicle: VehicleListItem;
  onClick: () => void;
}

export const VehicleCard = ({ vehicle, onClick }: VehicleCardProps) => {
  return (
    <div 
      onClick={onClick}
      className="group cursor-pointer hover:shadow-md transition-shadow bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col"
    >
      {/* Top Section - Image Area */}
      <div className="relative w-full h-48 bg-gray-100">
        {vehicle.thumbnail_url ? (
          <img 
            src={vehicle.thumbnail_url} 
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Car className="w-12 h-12 text-gray-300" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <Badge variant={getVehicleStatusVariant(vehicle.vehicle_status)}>
            {vehicle.vehicle_status.charAt(0).toUpperCase() + vehicle.vehicle_status.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Bottom Section - Content */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-base font-semibold text-gray-900">
          {vehicle.brand} {vehicle.model}
        </h3>
        
        <p className="text-xs text-gray-500 mt-0.5">
          {vehicle.vehicle_type} • {vehicle.transmission}
        </p>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Droplets className="w-3.5 h-3.5" />
            <span>{vehicle.fuel_type}</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5" />
            <span>{vehicle.branch_tag}</span>
          </div>
        </div>

        {/* Pricing Row */}
        <div className="mt-auto pt-4 flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(vehicle.hourly_rate)}/hr
            </span>
            <span className="text-xs text-gray-500">
              {formatCurrency(vehicle.daily_rate)}/day
            </span>
          </div>
          
          <span className="text-xs text-blue-600 font-medium group-hover:underline underline-offset-2">
            Book Now
          </span>
        </div>
      </div>
    </div>
  );
};