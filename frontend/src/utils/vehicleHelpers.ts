import type { 
  VehicleStatus, 
  BookingStatus, 
  KYCStatus, 
  DamageClassification 
} from '../types';

export const getVehicleStatusVariant = (status: VehicleStatus): 'success' | 'warning' | 'neutral' => {
  switch (status) {
    case 'available': return 'success';
    case 'maintenance': return 'warning';
    case 'retired': return 'neutral';
    default: return 'neutral';
  }
};

export const getBookingStatusVariant = (status: BookingStatus): 'info' | 'success' | 'neutral' | 'danger' => {
  switch (status) {
    case 'reserved': return 'info';
    case 'active': return 'success';
    case 'completed': return 'neutral';
    case 'cancelled': return 'danger';
    default: return 'neutral';
  }
};

export const getKycStatusVariant = (status: KYCStatus): 'success' | 'warning' | 'danger' => {
  switch (status) {
    case 'verified': return 'success';
    case 'pending':
    case 'needs_review': return 'warning';
    case 'failed': return 'danger';
    default: return 'warning';
  }
};

export const getDamageVariant = (classification: DamageClassification): 'success' | 'warning' | 'danger' => {
  switch (classification) {
    case 'Green': return 'success';
    case 'Amber':
    case 'needs_review': return 'warning';
    case 'Red': return 'danger';
    default: return 'warning';
  }
};

export const formatCurrency = (amount: string | number): string => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

export const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  const datePart = date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart}, ${timePart}`;
};