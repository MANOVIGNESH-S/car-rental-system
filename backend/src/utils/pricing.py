import math
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from src.core.exceptions.base import ValidationError

def calculate_rental_fee(
    start_time: datetime,
    end_time: datetime,
    hourly_rate: Decimal,
    daily_rate: Decimal
) -> Decimal:
    """
    Calculates rental fees based on duration.
    Switches from hourly to daily rates after 12 hours.
    """
    if end_time <= start_time:
        raise ValidationError("End time must be after start time")

    duration_seconds = (end_time - start_time).total_seconds()
    total_hours = math.ceil(duration_seconds / 3600)

    if total_hours <= 12:
        fee = Decimal(total_hours) * hourly_rate
    else:
        total_days = math.ceil(Decimal(total_hours) / Decimal(24))
        fee = total_days * daily_rate

    return fee.quantize(Decimal("0.00"), rounding=ROUND_HALF_UP)