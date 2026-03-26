import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Car, 
  SlidersHorizontal, 
  Search, 
  X, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { useInventory } from '../../features/inventory/hooks/useInventory';
import { VehicleCard } from '../../features/inventory/components/VehicleCard';
import { Spinner } from '../../components/ui/Spinner';

const VehicleListPage = () => {
  const navigate = useNavigate();
  const { vehicles, isLoading, error, setFilters } = useInventory();
  
  // Local state for form fields
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [formValues, setFormValues] = useState({
    branch_tag: '',
    vehicle_type: '',
    fuel_type: '',
    transmission: '',
    start_time: '',
    end_time: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    // Convert empty strings to undefined for the API service
    const activeFilters = Object.fromEntries(
      Object.entries(formValues).map(([key, value]) => [key, value || undefined])
    );
    setFilters(activeFilters);
    setShowMobileFilters(false);
  };

  const handleClear = () => {
    const resetValues = {
      branch_tag: '',
      vehicle_type: '',
      fuel_type: '',
      transmission: '',
      start_time: '',
      end_time: '',
    };
    setFormValues(resetValues);
    setFilters(resetValues);
  };

  // Date Constraints
  const now = new Date();
  const minPickup = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0).toISOString().slice(0, 16);
  const maxPickup = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Browse Vehicles</h1>
        <p className="text-sm text-gray-500">Find the perfect car for your trip</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between md:hidden mb-4">
          <button 
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {showMobileFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {(formValues.branch_tag || formValues.vehicle_type) && (
            <button onClick={handleClear} className="text-xs text-blue-600 font-medium">Clear All</button>
          )}
        </div>

        <div className={`${showMobileFilters ? 'block' : 'hidden'} md:block`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Branch */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Location</label>
              <input 
                name="branch_tag"
                value={formValues.branch_tag}
                onChange={handleInputChange}
                placeholder="e.g. CBE-RSPURAM"
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Vehicle Type */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Vehicle Type</label>
              <select 
                name="vehicle_type"
                value={formValues.vehicle_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="Car">Car</option>
                <option value="SUV">SUV</option>
                <option value="Bike">Bike</option>
                <option value="Van">Van</option>
              </select>
            </div>

            {/* Fuel Type */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Fuel</label>
              <select 
                name="fuel_type"
                value={formValues.fuel_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Fuel</option>
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="EV">EV</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            {/* Transmission */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Transmission</label>
              <select 
                name="transmission"
                value={formValues.transmission}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Transmission</option>
                <option value="Manual">Manual</option>
                <option value="Automatic">Automatic</option>
              </select>
            </div>

            {/* Pickup */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Pickup Date & Time</label>
              <input 
                type="datetime-local"
                name="start_time"
                min={minPickup}
                max={maxPickup}
                value={formValues.start_time}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Return */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Return Date & Time</label>
              <input 
                type="datetime-local"
                name="end_time"
                min={formValues.start_time || minPickup}
                value={formValues.end_time}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2 lg:col-span-2 xl:col-span-2">
              <button 
                onClick={handleSearch}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
              <button 
                onClick={handleClear}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-center">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-24 bg-white border border-gray-200 rounded-xl">
          <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">No vehicles available matching your criteria.</p>
          <button onClick={handleClear} className="mt-2 text-sm text-blue-600 hover:underline">Clear filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {vehicles.map((vehicle) => (
            <VehicleCard 
              key={vehicle.vehicle_id} 
              vehicle={vehicle} 
              onClick={() => navigate(`/portal/vehicles/${vehicle.vehicle_id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default VehicleListPage;