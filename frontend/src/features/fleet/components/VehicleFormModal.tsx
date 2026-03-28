import React, { useState, useEffect } from 'react';
import { X, Plus, Loader2, Trash2 } from 'lucide-react';
import { useVehicleForm } from '../hooks/useVehicleForm';
import type { VehicleAdmin, Transmission, FuelType } from '../../../types/index'; // Updated Import

export interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editVehicle?: VehicleAdmin | null; // Updated Type
}

export function VehicleFormModal({
  isOpen,
  onClose,
  onSuccess,
  editVehicle,
}: VehicleFormModalProps) {
  const { create, update, isSubmitting, error, resetState } = useVehicleForm();
  const isEdit = !!editVehicle;

  // Form State
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [transmission, setTransmission] = useState<Transmission | ''>('');
  const [fuelType, setFuelType] = useState<FuelType | ''>('');
  
  const [branchTag, setBranchTag] = useState('');
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [dailyRate, setDailyRate] = useState<string>('');
  const [securityDeposit, setSecurityDeposit] = useState<string>('');
  const [fuelLevelPct, setFuelLevelPct] = useState<string>('');
  
  const [insuranceUrl, setInsuranceUrl] = useState('');
  const [rcUrl, setRcUrl] = useState('');
  const [pucUrl, setPucUrl] = useState('');
  
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState('');
  const [rcExpiryDate, setRcExpiryDate] = useState('');
  const [pucExpiryDate, setPucExpiryDate] = useState('');
  
  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>(['']);

    useEffect(() => {
        if (isOpen) {
        // Wrap state updates in setTimeout to fix the synchronous setState linter error
        const timer = setTimeout(() => {
            if (editVehicle) {
            setBrand(editVehicle.brand);
            setModel(editVehicle.model);
            setVehicleType(editVehicle.vehicle_type);
            setTransmission(editVehicle.transmission);
            setFuelType(editVehicle.fuel_type);
            setBranchTag(editVehicle.branch_tag);
            setHourlyRate(editVehicle.hourly_rate.toString());
            setDailyRate(editVehicle.daily_rate.toString());
            setSecurityDeposit(editVehicle.security_deposit.toString());
            setFuelLevelPct(editVehicle.fuel_level_pct.toString());
            setInsuranceUrl(editVehicle.insurance_url || '');
            setRcUrl(editVehicle.rc_url || '');
            setPucUrl(editVehicle.puc_url || '');
            setInsuranceExpiryDate(editVehicle.insurance_expiry_date || '');
            setRcExpiryDate(editVehicle.rc_expiry_date || '');
            setPucExpiryDate(editVehicle.puc_expiry_date || '');
            setThumbnailUrls(
                editVehicle.thumbnail_urls?.length ? [...editVehicle.thumbnail_urls] : ['']
            );
            } else {
            setBrand('');
            setModel('');
            setVehicleType('');
            setTransmission('');
            setFuelType('');
            setBranchTag('');
            setHourlyRate('');
            setDailyRate('');
            setSecurityDeposit('');
            setFuelLevelPct('100');
            setInsuranceUrl('');
            setRcUrl('');
            setPucUrl('');
            setInsuranceExpiryDate('');
            setRcExpiryDate('');
            setPucExpiryDate('');
            setThumbnailUrls(['']);
            }
            resetState();
        }, 0);
        
        return () => clearTimeout(timer);
        }
    }, [isOpen, editVehicle, resetState]);

  const handleThumbnailChange = (index: number, value: string) => {
    const newUrls = [...thumbnailUrls];
    newUrls[index] = value;
    setThumbnailUrls(newUrls);
  };

  const addThumbnail = () => {
    setThumbnailUrls([...thumbnailUrls, '']);
  };

  const removeThumbnail = (index: number) => {
    if (thumbnailUrls.length > 1) {
      const newUrls = [...thumbnailUrls];
      newUrls.splice(index, 1);
      setThumbnailUrls(newUrls);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validThumbnails = thumbnailUrls.filter((url) => url.trim() !== '');
    
    if (isEdit && editVehicle) {
      const result = await update(editVehicle.vehicle_id, {
        branch_tag: branchTag,
        hourly_rate: Number(hourlyRate),
        daily_rate: Number(dailyRate),
        security_deposit: Number(securityDeposit),
        fuel_level_pct: Number(fuelLevelPct),
        insurance_url: insuranceUrl,
        rc_url: rcUrl,
        puc_url: pucUrl,
        insurance_expiry_date: insuranceExpiryDate,
        rc_expiry_date: rcExpiryDate,
        puc_expiry_date: pucExpiryDate,
        thumbnail_urls: validThumbnails,
      });
      if (result) {
        onSuccess();
        onClose();
      }
    } else {
      const result = await create({
        brand,
        model,
        vehicle_type: vehicleType,
        transmission: transmission as Transmission,
        fuel_type: fuelType as FuelType,
        branch_tag: branchTag,
        hourly_rate: Number(hourlyRate),
        daily_rate: Number(dailyRate),
        security_deposit: Number(securityDeposit),
        fuel_level_pct: Number(fuelLevelPct),
        insurance_url: insuranceUrl,
        rc_url: rcUrl,
        puc_url: pucUrl,
        insurance_expiry_date: insuranceExpiryDate,
        rc_expiry_date: rcExpiryDate,
        puc_expiry_date: pucExpiryDate,
        thumbnail_urls: validThumbnails,
      });
      if (result) {
        onSuccess();
        onClose();
      }
    }
  };

  if (!isOpen && !isSubmitting) return null;

  const inputClass = "w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 disabled:opacity-50 disabled:bg-gray-50";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <>
      {/* Fixed overlay */}
      <div 
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div 
        className={`fixed right-0 top-0 h-full w-full max-w-lg bg-white z-50 shadow-xl overflow-hidden flex flex-col transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <h2 className="text-xl font-semibold text-gray-800">
            {isEdit ? 'Edit Vehicle' : 'Add Vehicle'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <form id="vehicle-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Section 1 — Basic Info */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm space-y-4">
              <h3 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4">Basic Info</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Brand</label>
                  <input required disabled={isEdit} value={brand} onChange={e => setBrand(e.target.value)} placeholder="Toyota" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Model</label>
                  <input required disabled={isEdit} value={model} onChange={e => setModel(e.target.value)} placeholder="Camry" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Vehicle Type</label>
                <input required disabled={isEdit} value={vehicleType} onChange={e => setVehicleType(e.target.value)} placeholder="Car, SUV, Bike, Van" className={inputClass} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Transmission</label>
                  <select required disabled={isEdit} value={transmission} onChange={e => setTransmission(e.target.value as Transmission)} className={inputClass}>
                    <option value="" disabled>Select...</option>
                    <option value="manual">Manual</option>
                    <option value="automatic">Automatic</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Fuel Type</label>
                  <select required disabled={isEdit} value={fuelType} onChange={e => setFuelType(e.target.value as FuelType)} className={inputClass}>
                    <option value="" disabled>Select...</option>
                    <option value="petrol">Petrol</option>
                    <option value="diesel">Diesel</option>
                    <option value="ev">EV</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2 — Branch & Pricing */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm space-y-4">
              <h3 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4">Operational & Pricing</h3>
              <div>
                <label className={labelClass}>Branch Tag</label>
                <input required value={branchTag} onChange={e => setBranchTag(e.target.value)} placeholder="CBE-RSPURAM" className={inputClass} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Hourly Rate (₹)</label>
                  <input type="number" required min="0" step="0.01" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="150" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Daily Rate (₹)</label>
                  <input type="number" required min="0" step="0.01" value={dailyRate} onChange={e => setDailyRate(e.target.value)} placeholder="1500" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Deposit (₹)</label>
                  <input type="number" required min="0" step="0.01" value={securityDeposit} onChange={e => setSecurityDeposit(e.target.value)} placeholder="3000" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Fuel Level (%)</label>
                <input type="number" required min="0" max="100" value={fuelLevelPct} onChange={e => setFuelLevelPct(e.target.value)} placeholder="100" className={inputClass} />
              </div>
            </div>

            {/* Section 3 — Document URLs */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm space-y-4">
              <h3 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4">Document URLs</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Insurance URL</label>
                  <input type="url" required value={insuranceUrl} onChange={e => setInsuranceUrl(e.target.value)} placeholder="https://..." className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>RC URL</label>
                  <input type="url" required value={rcUrl} onChange={e => setRcUrl(e.target.value)} placeholder="https://..." className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>PUC URL</label>
                  <input type="url" required value={pucUrl} onChange={e => setPucUrl(e.target.value)} placeholder="https://..." className={inputClass} />
                </div>
              </div>
            </div>

            {/* Section 4 — Document Expiry Dates */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm space-y-4">
              <h3 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4">Expiry Dates</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Insurance Expiry</label>
                  <input type="date" required value={insuranceExpiryDate} onChange={e => setInsuranceExpiryDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>RC Expiry</label>
                  <input type="date" required value={rcExpiryDate} onChange={e => setRcExpiryDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>PUC Expiry</label>
                  <input type="date" required value={pucExpiryDate} onChange={e => setPucExpiryDate(e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            {/* Section 5 — Thumbnail URLs */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm space-y-4">
              <h3 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4">Images</h3>
              <div className="space-y-3">
                {thumbnailUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input 
                      type="url"
                      required={index === 0} 
                      value={url} 
                      onChange={e => handleThumbnailChange(index, e.target.value)} 
                      placeholder="https://..." 
                      className={inputClass} 
                    />
                    <button
                      type="button"
                      onClick={() => removeThumbnail(index)}
                      disabled={thumbnailUrls.length === 1}
                      className="inline-flex items-center justify-center p-2 bg-white hover:bg-gray-50 text-red-600 border border-gray-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addThumbnail}
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
              >
                <Plus className="w-4 h-4" />
                Add another image
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-white">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="vehicle-form"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Vehicle'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}