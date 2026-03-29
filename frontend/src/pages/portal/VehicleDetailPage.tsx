import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Fuel, Info, CalendarDays, ShieldCheck } from 'lucide-react';
import { useVehicleDetail } from '../../features/inventory/hooks/useVehicleDetail';
import { useAuth } from '../../context/AuthContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { 
  formatCurrency, 
  getVehicleStatusVariant 
} from '../../utils/vehicleHelpers';

const VehicleDetailPage = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { vehicle, isLoading, error } = useVehicleDetail(vehicleId || '');
  usePageTitle(vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Vehicle');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (isLoading) return <Spinner />;
  
  if (error || !vehicle) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-center">
          <p className="text-sm text-red-700">{error || 'Vehicle not found'}</p>
          <button onClick={() => navigate('/portal/vehicles')} className="mt-4 text-sm text-blue-600 font-medium hover:underline">
            Back to Inventory
          </button>
        </div>
      </div>
    );
  }

  const currentImage = selectedImage || vehicle.thumbnail_url;
  const fuelColor = vehicle.fuel_level_pct > 50 ? 'bg-green-500' : vehicle.fuel_level_pct > 20 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Back Button */}
      <button 
        onClick={() => navigate('/portal/vehicles')}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Vehicles
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: Gallery & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gallery */}
          <div className="space-y-4">
            <img 
              src={currentImage} 
              alt={`${vehicle.brand} ${vehicle.model}`}
              className="w-full aspect-video rounded-xl object-cover shadow-sm bg-gray-100"
            />
            {vehicle.thumbnail_urls && vehicle.thumbnail_urls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {[vehicle.thumbnail_url, ...vehicle.thumbnail_urls].map((url, idx) => (
                  <img 
                    key={idx}
                    src={url}
                    alt="Thumbnail"
                    onClick={() => setSelectedImage(url)}
                    className={`w-24 h-16 rounded-lg object-cover cursor-pointer border-2 transition-all ${
                      currentImage === url ? 'border-blue-600 scale-95' : 'border-transparent hover:border-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Vehicle Info Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{vehicle.brand} {vehicle.model}</h1>
                <p className="text-sm text-gray-500 mt-1">{vehicle.transmission} • {vehicle.fuel_type}</p>
              </div>
              <Badge variant={getVehicleStatusVariant(vehicle.vehicle_status)}>
                {vehicle.vehicle_status.toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-8">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Type</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{vehicle.vehicle_type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Transmission</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{vehicle.transmission}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Fuel Type</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{vehicle.fuel_type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Branch</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{vehicle.branch_tag}</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Fuel className="w-4 h-4" />
                  Fuel Level
                </div>
                <span className="text-sm font-bold text-gray-900">{vehicle.fuel_level_pct}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${fuelColor}`}
                  style={{ width: `${vehicle.fuel_level_pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Booking Summary Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 bg-white border border-gray-200 rounded-xl p-6 shadow-md">
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-gray-900">{formatCurrency(vehicle.hourly_rate)}</span>
                <span className="text-gray-500 text-sm">/ hour</span>
              </div>
              <p className="text-sm text-gray-500">{formatCurrency(vehicle.daily_rate)} / day</p>
              <p className="text-xs text-gray-400 mt-2">Security Deposit: {formatCurrency(vehicle.security_deposit)}</p>
            </div>

            <div className="border-t border-gray-100 my-6" />

            <div className="space-y-4">
              {vehicle.vehicle_status !== 'available' ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-3">
                  <Info className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800 font-medium">This vehicle is currently under maintenance and cannot be booked.</p>
                </div>
              ) : !isAuthenticated ? (
                <button 
                  onClick={() => navigate('/login')}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Sign In to Book
                </button>
              ) : user?.kyc_status !== 'verified' ? (
                <div className="space-y-3">
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-3">
                    <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-800 font-medium">Complete KYC verification to book this vehicle.</p>
                  </div>
                  <button 
                    onClick={() => navigate('/portal/kyc')}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Verify KYC
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => navigate(`/portal/vehicles/${vehicleId}/book`)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg shadow-blue-100"
                >
                  <CalendarDays className="w-4 h-4" />
                  Book This Vehicle
                </button>
              )}
            </div>

            <p className="text-[10px] text-gray-400 mt-4 text-center leading-relaxed">
              Bookings available 9AM–6PM only • Max 14 days duration • Standard terms and conditions apply.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailPage;