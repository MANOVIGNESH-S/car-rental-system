import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Smartphone, CreditCard, Banknote, 
  Car, Fuel, Settings2, MapPin, Loader2 
} from 'lucide-react';
import { useVehicleDetail } from '../../features/inventory/hooks/useVehicleDetail';
import { useCreateBooking } from '../../features/bookings/hooks/useCreateBooking';
import { Spinner } from '../../components/ui/Spinner';
import { formatCurrency } from '../../utils/vehicleHelpers';
import { type PaymentMethod } from '../../types';

const BookingPage = () => {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  
  const { vehicle, isLoading: vehicleLoading, error: vehicleError } = useVehicleDetail(vehicleId || '');
  const { submitBooking, isLoading: isSubmitting, error: bookingError } = useCreateBooking();

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');

  // 1. Min: today + 1 hour, rounded to next hour
  const minStart = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0); 
    return d.toISOString().slice(0, 16);
  }, []);

  const maxStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().slice(0, 16);
  }, []);

  const pricing = useMemo(() => {
    if (!startTime || !endTime || !vehicle) return null;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return null;

    const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;

    const rentalFee = totalHours < 24 
      ? totalHours * Number(vehicle.hourly_rate)
      : (days * Number(vehicle.daily_rate)) + (remainingHours * Number(vehicle.hourly_rate));

    return {
      totalHours,
      days,
      remainingHours,
      rentalFee,
      securityDeposit: Number(vehicle.security_deposit),
      durationText: days > 0 ? `${days} days ${remainingHours} hours` : `${totalHours} hours`
    };
  }, [startTime, endTime, vehicle]);

  if (vehicleLoading) return <Spinner />;

  if (vehicleError || !vehicle) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-4">
          <p className="text-sm text-red-700">{vehicleError || 'Vehicle not found'}</p>
        </div>
        <button onClick={() => navigate(`/portal/vehicles/${vehicleId}`)} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Vehicle
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to={`/portal/vehicles/${vehicleId}`} className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Book this vehicle</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-400">
                <Car className="w-12 h-12" />
              </div>
              <div className="p-4 sm:p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{vehicle.brand} {vehicle.model}</h2>
                <div className="flex flex-wrap gap-3 mb-4">
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Settings2 className="w-3 h-3" /> {vehicle.transmission}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Fuel className="w-3 h-3" /> {vehicle.fuel_type}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500"><MapPin className="w-3 h-3" /> {vehicle.branch_tag}</span>
                </div>
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Hourly Rate</span><span className="font-medium">{formatCurrency(Number(vehicle.hourly_rate))}/hr</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Daily Rate</span><span className="font-medium">{formatCurrency(Number(vehicle.daily_rate))}/day</span></div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-50"><span className="text-gray-500">Security Deposit</span><span className="font-medium text-amber-600">{formatCurrency(Number(vehicle.security_deposit))}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-8">
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
              <form onSubmit={(e) => { e.preventDefault(); submitBooking({ vehicle_id: vehicleId!, start_time: new Date(startTime).toISOString(), end_time: new Date(endTime).toISOString(), payment_method: paymentMethod as PaymentMethod }); }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Pickup Date & Time</label>
                    <input type="datetime-local" min={minStart} max={maxStart} value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    <p className="mt-1 text-[10px] text-gray-400">Available 9:00 AM – 6:00 PM only</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Return Date & Time</label>
                    <input type="datetime-local" min={startTime || minStart} value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    {pricing && <p className="mt-1 text-xs font-medium text-blue-600">Duration: {pricing.durationText}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-3">Payment Method</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'UPI', icon: Smartphone, label: 'UPI' },
                      { id: 'card', icon: CreditCard, label: 'Card' },
                      { id: 'cash', icon: Banknote, label: 'Cash' }
                    ].map((m) => (
                      <button key={m.id} type="button" onClick={() => setPaymentMethod(m.id as PaymentMethod)} className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-all ${paymentMethod === m.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
                        <m.icon className="w-5 h-5 mb-1" />
                        <span className="text-xs font-medium">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {pricing && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm text-gray-700"><span>Duration:</span><span>{pricing.durationText}</span></div>
                    <div className="flex justify-between text-sm text-gray-700"><span>Rental fee:</span><span>{formatCurrency(pricing.rentalFee)}</span></div>
                    <div className="flex justify-between text-sm text-gray-700"><span>Security deposit:</span><span>{formatCurrency(pricing.securityDeposit)}</span></div>
                    <div className="pt-2 border-t border-gray-200 flex justify-between"><span className="font-bold text-gray-900">Total:</span><span className="font-bold text-blue-600">{formatCurrency(pricing.rentalFee + pricing.securityDeposit)}</span></div>
                    <p className="text-[10px] text-gray-400 italic mt-2">Actual total confirmed by server on booking</p>
                  </div>
                )}

                {bookingError && <div className="rounded-lg bg-red-50 border border-red-200 p-4"><p className="text-sm text-red-700">{bookingError}</p></div>}

                <button type="submit" disabled={isSubmitting || !startTime || !endTime || !paymentMethod} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Booking'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;