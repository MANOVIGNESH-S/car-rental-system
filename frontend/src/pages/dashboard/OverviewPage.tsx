import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, CheckCircle2, Wrench, AlertTriangle, Plus, CalendarDays, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFleet } from '../../features/fleet/hooks/useFleet';
import { formatDateTime } from '../../utils/vehicleHelpers';

export function OverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { vehicles, expiringDocs, isLoading, error } = useFleet();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const stats = useMemo(() => {
    if (!vehicles) return { total: 0, available: 0, maintenance: 0 };
    return {
      total: vehicles.length,
      available: vehicles.filter((v) => v.vehicle_status === 'available').length,
      maintenance: vehicles.filter((v) => v.vehicle_status === 'maintenance').length,
    };
  }, [vehicles]);

  const expiringCount = expiringDocs.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. WELCOME HEADER */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}, {user?.full_name || 'Staff'}
          </h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 capitalize">
            {user?.role || 'Member'}
          </span>
        </div>
      </div>

      {/* 2. STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 — Total Vehicles */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Car className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats.total}</p>
          <p className="text-sm text-gray-500">Total Vehicles</p>
        </div>

        {/* Card 2 — Available */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats.available}</p>
          <p className="text-sm text-gray-500">Available</p>
        </div>

        {/* Card 3 — In Maintenance */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats.maintenance}</p>
          <p className="text-sm text-gray-500">In Maintenance</p>
        </div>

        {/* Card 4 — Expiring Docs */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center relative">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              {expiringCount > 0 && (
                <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-red-600 animate-pulse" />
              )}
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{expiringCount}</p>
          <p className="text-sm text-gray-500">Expiring Docs (30 days)</p>
        </div>
      </div>

      {/* 3. EXPIRING DOCUMENTS ALERT */}
      {expiringCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4">
          <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-grow">
            <h2 className="text-sm font-semibold text-amber-900">Documents Expiring Soon</h2>
            <ul className="mt-2 space-y-1.5">
              {expiringDocs.slice(0, 3).map((item) => (
                <li key={item.vehicle_id} className="text-sm text-amber-800">
                  {item.brand} {item.model} ({item.branch_tag}) —{' '}
                  {item.expiring.map(doc => `${doc.doc_type} expires ${formatDateTime(doc.expiry_date)}`).join(', ')}
                </li>
              ))}
            </ul>
            {expiringCount > 3 && (
              <p className="mt-1.5 text-xs text-amber-700">and {expiringCount - 3} more...</p>
            )}
          </div>
          <div className="flex-shrink-0 self-start">
            <button 
              onClick={() => navigate('/dashboard/fleet')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-800"
            >
              View all fleet
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. QUICK ACTIONS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/dashboard/fleet?action=add')}
          className="group bg-white border border-gray-200 rounded-xl p-6 text-left shadow-sm hover:border-blue-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:bg-blue-100 transition-colors">
              <Plus className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mt-4">Add Vehicle</h3>
          <p className="text-sm text-gray-600 mt-1">Register a new vehicle to the fleet.</p>
        </button>

        <button
          onClick={() => navigate('/dashboard/bookings')}
          className="group bg-white border border-gray-200 rounded-xl p-6 text-left shadow-sm hover:border-blue-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:bg-blue-100 transition-colors">
              <CalendarDays className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mt-4">View Bookings</h3>
          <p className="text-sm text-gray-600 mt-1">Manage current and upcoming rentals.</p>
        </button>

        <button
          onClick={() => navigate('/dashboard/kyc-review')}
          className="group bg-white border border-gray-200 rounded-xl p-6 text-left shadow-sm hover:border-blue-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:bg-blue-100 transition-colors">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mt-4">Review KYC</h3>
          <p className="text-sm text-gray-600 mt-1">Approve or reject customer verifications.</p>
        </button>
      </div>
    </div>
  );
}

export default OverviewPage;