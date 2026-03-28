import React, { useState, useEffect } from 'react';
import { X, Loader2, Car, Settings, DollarSign, FileText, Image as ImageIcon } from 'lucide-react';
import { useVehicleForm } from '../hooks/useVehicleForm';
import type { VehicleAdmin, Transmission, FuelType } from '../../../types/index';

export interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editVehicle?: VehicleAdmin | null;
}

export function VehicleFormModal({
  isOpen,
  onClose,
  onSuccess,
  editVehicle,
}: VehicleFormModalProps) {
  const { create, update, isSubmitting, error, resetState } = useVehicleForm();
  const isEdit = !!editVehicle;

  // Basic state
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [transmission, setTransmission] = useState<Transmission | ''>('');
  const [fuelType, setFuelType] = useState<FuelType | ''>('');

  const [branchTag, setBranchTag] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [fuelLevelPct, setFuelLevelPct] = useState('');

  const [vehicleImages, setVehicleImages] = useState<File[]>([]);
  const [insuranceDoc, setInsuranceDoc] = useState<File | null>(null);
  const [rcDoc, setRcDoc] = useState<File | null>(null);
  const [pucDoc, setPucDoc] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
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

          // reset files
          setVehicleImages([]);
          setInsuranceDoc(null);
          setRcDoc(null);
          setPucDoc(null);
        }
        resetState();
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [isOpen, editVehicle, resetState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEdit && editVehicle) {
      const result = await update(editVehicle.vehicle_id, {
        branch_tag: branchTag,
        hourly_rate: Number(hourlyRate),
        daily_rate: Number(dailyRate),
        security_deposit: Number(securityDeposit),
        fuel_level_pct: Number(fuelLevelPct),
      });

      if (result) {
        onSuccess();
        onClose();
      }
    } else {
      if (!insuranceDoc || !rcDoc || !pucDoc || vehicleImages.length === 0) {
        alert('Please upload all required files');
        return;
      }

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
        vehicle_images: vehicleImages,
        insurance_doc: insuranceDoc,
        rc_doc: rcDoc,
        puc_doc: pucDoc,
      });

      if (result) {
        onSuccess();
        onClose();
      }
    }
  };

  if (!isOpen && !isSubmitting) return null;

  const inputClass = "w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400";
  const labelClass = "block text-xs font-medium text-gray-700 mb-1.5";
  const sectionHeaderClass = "flex items-center gap-2 text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4 mt-6 first:mt-0";
  const fileInputClass = "block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-gray-200 rounded-lg bg-white";

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 transition-opacity" 
        onClick={onClose} 
      />

      {/* Slide-over Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-gray-50 shadow-2xl flex flex-col transform transition-transform duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isEdit ? 'Edit Vehicle Details' : 'Add New Vehicle'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEdit ? 'Update the pricing and status configuration.' : 'Enter details and upload required documents.'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body / Form */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="vehicle-form" onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-6">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className={sectionHeaderClass}>
                <Car className="w-4 h-4 text-blue-600" />
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Brand</label>
                  <input
                    placeholder="e.g. Toyota"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className={inputClass}
                    disabled={isEdit}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Model</label>
                  <input
                    placeholder="e.g. Camry"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className={inputClass}
                    disabled={isEdit}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Vehicle Type</label>
                  <input
                    placeholder="e.g. Sedan, SUV, Hatchback"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className={inputClass}
                    disabled={isEdit}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className={sectionHeaderClass}>
                <Settings className="w-4 h-4 text-blue-600" />
                Specifications
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Transmission</label>
                  <select
                    value={transmission}
                    onChange={(e) => setTransmission(e.target.value as Transmission)}
                    className={inputClass}
                    disabled={isEdit}
                    required
                  >
                    <option value="" disabled>Select Transmission</option>
                    <option value="Manual">Manual</option>
                    <option value="Automatic">Automatic</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Fuel Type</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value as FuelType)}
                    className={inputClass}
                    disabled={isEdit}
                    required
                  >
                    <option value="" disabled>Select Fuel</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="EV">EV</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Fuel Level (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="100"
                    value={fuelLevelPct}
                    onChange={(e) => setFuelLevelPct(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Branch Tag</label>
                  <input
                    placeholder="e.g. Downtown, Airport"
                    value={branchTag}
                    onChange={(e) => setBranchTag(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h3 className={sectionHeaderClass}>
                <DollarSign className="w-4 h-4 text-blue-600" />
                Pricing Options
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Hourly Rate ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Daily Rate ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Security Deposit ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Document Uploads - Only shown on Create */}
            {!isEdit && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className={sectionHeaderClass}>
                  <FileText className="w-4 h-4 text-blue-600" />
                  Documents & Images
                </h3>
                <div className="space-y-5">
                  <div>
                    <label className={labelClass}>Vehicle Images (Multiple)</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg"
                        onChange={(e) => setVehicleImages(Array.from(e.target.files || []))}
                        className={`${fileInputClass} pl-10`}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Insurance Document (PDF)</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setInsuranceDoc(e.target.files?.[0] || null)}
                      className={fileInputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Registration Certificate (RC - PDF)</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setRcDoc(e.target.files?.[0] || null)}
                      className={fileInputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>PUC Certificate (PDF)</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setPucDoc(e.target.files?.[0] || null)}
                      className={fileInputClass}
                      required
                    />
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="vehicle-form"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isEdit ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>{isEdit ? 'Save Changes' : 'Add Vehicle'}</>
            )}
          </button>
        </div>

      </div>
    </>
  );
}