from enum import Enum


class UserRole(str, Enum):
    admin = "Admin"
    manager = "Manager"
    customer = "Customer"


class KYCStatus(str, Enum):
    pending = "pending"
    verified = "verified"
    failed = "failed"
    needs_review = "needs_review"


class VehicleStatus(str, Enum):
    available = "available"
    maintenance = "maintenance"
    retired = "retired"


class Transmission(str, Enum):
    manual = "Manual"
    automatic = "Automatic"


class FuelType(str, Enum):
    petrol = "Petrol"
    diesel = "Diesel"
    ev = "EV"
    hybrid = "Hybrid"


class BookingStatus(str, Enum):
    reserved = "reserved"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"


class PaymentMethod(str, Enum):
    upi = "UPI"
    card = "card"
    cash = "cash"


class TransactionType(str, Enum):
    rental_fee = "rental_fee"
    security_deposit = "security_deposit"
    refund = "refund"
    damage_charge = "damage_charge"


class PaymentStatus(str, Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"


class DamageClassification(str, Enum):
    green = "Green"
    amber = "Amber"
    red = "Red"
    needs_review = "needs_review"


class JobType(str, Enum):
    kyc_verification = "kyc_verification"
    damage_assessment = "damage_assessment"
    email_notification = "email_notification"
    vehicle_doc_extraction = "vehicle_doc_extraction"


class JobStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class ReferenceType(str, Enum):
    user = "user"
    booking = "booking"
    vehicle = "vehicle"
