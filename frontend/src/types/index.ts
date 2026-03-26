export type UserRole = 'Admin' | 'Manager' | 'Customer';
export type KYCStatus = 'pending' | 'verified' | 'failed' | 'needs_review';
export type BookingStatus = 'reserved' | 'active' | 'completed' | 'cancelled';
export type VehicleStatus = 'available' | 'maintenance' | 'retired';
export type Transmission = 'Manual' | 'Automatic';
export type FuelType = 'Petrol' | 'Diesel' | 'EV' | 'Hybrid';
export type PaymentMethod = 'UPI' | 'card' | 'cash';
export type TransactionType = 'rental_fee' | 'security_deposit' | 'refund' | 'damage_charge';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type DamageClassification = 'Green' | 'Amber' | 'Red' | 'needs_review';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type JobType = 'kyc_verification' | 'damage_assessment' | 'email_notification';

export interface User {
  user_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  kyc_status: KYCStatus;
  is_suspended: boolean;
  created_at: string;
}

export interface Profile extends User {
  phone_number: string;
  dl_expiry_date: string | null;
}

export interface VehicleListItem {
  vehicle_id: string;
  brand: string;
  model: string;
  vehicle_type: string;
  transmission: Transmission;
  fuel_type: FuelType;
  branch_tag: string;
  thumbnail_url: string;
  hourly_rate: string;
  daily_rate: string;
  security_deposit: string;
  fuel_level_pct: number;
  vehicle_status: VehicleStatus;
}

export interface VehicleDetail extends VehicleListItem {
  thumbnail_urls: string[];
  created_at: string;
}

export interface VehicleAdmin extends VehicleDetail {
  insurance_url: string;
  rc_url: string;
  puc_url: string;
  insurance_expiry_date: string;
  rc_expiry_date: string;
  puc_expiry_date: string;
}

export interface BookingPaymentInfo {
  payment_id: string;
  transaction_type: TransactionType;
  amount: string;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  mock_transaction_id: string | null;
  timestamp: string;
}

export interface BookingListItem {
  booking_id: string;
  vehicle_id: string;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_thumbnail: string | null;
  start_time: string;
  end_time: string;
  total_price: string;
  status: BookingStatus;
  created_at: string;
}

export interface BookingDetail {
  booking_id: string;
  vehicle_id: string;
  start_time: string;
  end_time: string;
  actual_end_time: string | null;
  rental_fee: string;
  security_deposit: string;
  total_price: string;
  is_physically_verified: boolean;
  status: BookingStatus;
  cancelled_at: string | null;
  created_at: string;
  payments: BookingPaymentInfo[];
}

export interface AdminBookingListItem {
  booking_id: string;
  user_id: string;
  user_name: string | null;
  user_phone: string | null;
  vehicle_id: string;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  branch_tag: string | null;
  start_time: string;
  end_time: string;
  total_price: string;
  status: BookingStatus;
  is_physically_verified: boolean;
}

export interface KYCStatusResponse {
  kyc_status: KYCStatus;
  dl_expiry_date: string | null;
  extracted_address: string | null;
  kyc_verified_at: string | null;
}

export interface PaymentRecord {
  payment_id: string;
  booking_id: string;
  initiated_by: string | null;
  amount: string;
  transaction_type: TransactionType;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  mock_transaction_id: string | null;
  timestamp: string;
}

export interface PaymentLedger {
  booking_id: string;
  payments: PaymentRecord[];
  total_charged: string;
  total_refunded: string;
}

export interface DamageLog {
  log_id: string;
  booking_id: string;
  pre_rental_image_urls: string[] | null;
  post_rental_image_urls: string[] | null;
  fuel_level_at_pickup: number | null;
  fuel_level_at_return: number | null;
  llm_classification: DamageClassification | null;
  created_at: string;
}

export interface AdminUserListItem {
  user_id: string;
  full_name: string;
  email: string;
  phone_number: string;
  role: UserRole;
  kyc_status: KYCStatus;
  is_suspended: boolean;
  created_at: string;
}

export interface AsyncJob {
  job_id: string;
  job_type: JobType;
  reference_id: string;
  reference_type: string;
  status: JobStatus;
  retry_count: number;
  last_error: string | null;
  celery_task_id: string | null;
  created_at: string;
  updated_at: string;
  is_stuck: boolean;
}


export interface LoginRequest {
  username: string; 
  password: string;
}

export interface RegisterRequest {
  full_name: string;
  email: string;
  phone_number: string;
  password: string;
}

export interface CreateBookingRequest {
  vehicle_id: string;
  start_time: string;
  end_time: string;
  payment_method: PaymentMethod;
}

export interface UpdateProfileRequest {
  full_name?: string;
  phone_number?: string;
}