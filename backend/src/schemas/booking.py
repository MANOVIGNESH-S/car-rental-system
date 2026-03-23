from __future__ import annotations

from datetime import datetime
from uuid import UUID
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field

from src.constants.enums import (
    BookingStatus, 
    PaymentMethod, 
    TransactionType, 
    PaymentStatus
)

class CreateBookingRequest(BaseModel):
    vehicle_id: UUID
    start_time: datetime
    end_time: datetime
    payment_method: PaymentMethod

class BookingPaymentInfo(BaseModel):
    payment_id: UUID
    transaction_type: TransactionType
    amount: Decimal
    payment_method: PaymentMethod
    status: PaymentStatus
    mock_transaction_id: str | None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

class BookingListItem(BaseModel):
    booking_id: UUID
    vehicle_id: UUID
    vehicle_brand: str | None = None
    vehicle_model: str | None = None
    vehicle_thumbnail: str | None = None
    start_time: datetime
    end_time: datetime
    total_price: Decimal
    status: BookingStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BookingDetailResponse(BaseModel):
    booking_id: UUID
    vehicle_id: UUID
    start_time: datetime
    end_time: datetime
    actual_end_time: datetime | None
    rental_fee: Decimal
    security_deposit: Decimal
    total_price: Decimal
    is_physically_verified: bool
    status: BookingStatus
    cancelled_at: datetime | None
    created_at: datetime
    payments: list[BookingPaymentInfo] = []

    model_config = ConfigDict(from_attributes=True)

class CreateBookingResponse(BaseModel):
    booking_id: UUID
    status: BookingStatus
    start_time: datetime
    end_time: datetime
    rental_fee: Decimal
    security_deposit: Decimal
    total_price: Decimal
    payment: BookingPaymentInfo

class AdminBookingListItem(BaseModel):
    booking_id: UUID
    user_id: UUID
    user_name: str | None = None
    user_phone: str | None = None
    vehicle_id: UUID
    vehicle_brand: str | None = None
    vehicle_model: str | None = None
    branch_tag: str | None = None
    start_time: datetime
    end_time: datetime
    total_price: Decimal
    status: BookingStatus
    is_physically_verified: bool

    model_config = ConfigDict(from_attributes=True)

class CheckinRequest(BaseModel):
    fuel_level_at_pickup: int = Field(ge=0, le=100)

class CheckoutRequest(BaseModel):
    fuel_level_at_return: int = Field(ge=0, le=100)

class CheckinResponse(BaseModel):
    booking_id: UUID
    status: BookingStatus
    is_physically_verified: bool
    fuel_level_at_pickup: int

class CheckoutResponse(BaseModel):
    booking_id: UUID
    status: BookingStatus
    actual_end_time: datetime
    damage_job_id: UUID