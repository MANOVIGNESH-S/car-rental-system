import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, X, Loader2, Car } from 'lucide-react';
import { useFleet } from '../../features/fleet/hooks/useFleet';
import { usePageTitle } from '../../hooks/usePageTitle';
import { getFleetVehicleById } from '../../features/fleet/services/fleetService';
import type { VehicleStatus, VehicleAdmin } from '../../types/index';
import { FleetTable } from '../../features/fleet/components/FleetTable';
import { ExpiryAlertCard } from '../../features/fleet/components/ExpiryAlertCard';
import { VehicleFormModal } from '../../features/fleet/components/VehicleFormModal';

interface ToastProps {
  message: string;
  onClose: () => void;
}

function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium animate-fade-in-up">
      {message}
    </div>
  );
}

export function FleetPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    vehicles, 
    isLoading, 
    expiringDocs, 
    isLoadingExpiry, 
    fetchVehicles, 
    fetchExpiringDocs, 
    removeVehicle, 
    changeStatus 
  } = useFleet();
  usePageTitle('Fleet Management');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleAdmin | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [branchFilter, setBranchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VehicleStatus>('all');

  // Load data on mount (handled by useFleet, but ensure action=add check)
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      // Wrapped in setTimeout to satisfy linter rules for async state updates in effects
      const timer = setTimeout(() => {
        setIsModalOpen(true);
        setSearchParams({}, { replace: true });
      }, 0);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams]);

  // THIS IS THE MISSING FUNCTION THAT FIXES YOUR ERRORS
  const showToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  const handleOpenAddModal = () => {
    setSelectedVehicle(null);
    setIsModalOpen(true);
  };

  const handleEdit = async (vehicleId: string) => {
    showToast('Loading vehicle details...');
    try {
      const data = await getFleetVehicleById(vehicleId);
      setSelectedVehicle(data);
      setIsModalOpen(true);
      setToastMessage(null); 
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      showToast(`Error: ${e.response?.data?.detail || 'Failed to fetch details'}`);
    }
  };

  const handleDelete = async (vehicleId: string) => {
    try {
      await removeVehicle(vehicleId);
      showToast('Vehicle deleted successfully');
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      showToast(`Error: ${e.response?.data?.detail || 'Delete failed'}`);
    }
  };

  const handleStatusChange = async (vehicleId: string, status: VehicleStatus) => {
    try {
      await changeStatus(vehicleId, status);
      showToast('Status updated');
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      showToast(`Error: ${e.response?.data?.detail || 'Update failed'}`);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedVehicle(null);
  };

  const handleFormSuccess = () => {
    fetchVehicles();
    fetchExpiringDocs();
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVehicles({
      branch_tag: branchFilter || undefined,
      vehicle_type: typeFilter || undefined,
    });
  };

  const handleFilterClear = () => {
    setBranchFilter('');
    setTypeFilter('');
    setStatusFilter('all');
    fetchVehicles({});
  };

  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];
    if (statusFilter === 'all') return vehicles;
    return vehicles.filter(v => v.vehicle_status === statusFilter);
  }, [vehicles, statusFilter]);

  const inputClass = "w-full sm:w-auto px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400";
  const selectClass = "w-full sm:w-auto px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Vehicle
        </button>
      </div>

      <ExpiryAlertCard 
        items={expiringDocs} 
        isLoading={isLoadingExpiry} 
        onDaysChange={(days) => fetchExpiringDocs(days)}
      />

      <form onSubmit={handleFilterSubmit} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            type="text"
            placeholder="Branch Tag (e.g. CBE-RSP)"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className={inputClass}
          />
          
          <input
            type="text"
            placeholder="Vehicle Type (e.g. SUV)"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={inputClass}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | VehicleStatus)}
            className={selectClass}
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
          </select>

          <div className="flex items-center gap-2 sm:ml-auto">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
            <button
              type="button"
              onClick={handleFilterClear}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>
      </form>

      {isLoading && vehicles.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      )}

      {(!isLoading || vehicles.length > 0) && (
        <FleetTable 
          vehicles={filteredVehicles}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      )}

      {!isLoading && vehicles.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-xl shadow-sm">
          <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No vehicles added yet.</p>
        </div>
      )}

      <VehicleFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleFormSuccess}
        editVehicle={selectedVehicle}
      />

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
}

export default FleetPage;