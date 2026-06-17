"""
schemas/crm.py
──────────────
Pydantic models for CRM request validation.
Google Sheets is the ONLY database — no SQL models here.

New columns added:
  - driver_name     → required when status == "Booked"
  - trip_from       → required when status == "Booked"
  - trip_to         → required when status == "Booked"
  - quote_price     → optional numeric
  - travel_date     → optional date (when the trip actually starts)
  - return_date     → optional date
"""

from typing import Optional
from pydantic import BaseModel, Field, validator, root_validator


# ─── Allowed values ────────────────────────────────────────────────────────────

MODE_VALUES    = {"Call", "WhatsApp"}
STATUS_VALUES  = {"Enquiry", "Booked", "Interested", "Super Interested", "Trip Decline", "Cancelled", "Not Interested"}
CHANNEL_VALUES = {"Meta Ads", "Google Ads"}


def _validate_date_str(v):
    if not v:
        return None
    from datetime import datetime
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            datetime.strptime(v, fmt)
            return v
        except ValueError:
            continue
    raise ValueError(f"Date '{v}' must be YYYY-MM-DD")


class CRMEntryCreate(BaseModel):
    customer_name:    str           = Field(..., min_length=1, max_length=120)
    contact:          str           = Field(..., min_length=6, max_length=20)
    description:      Optional[str] = Field(None, max_length=1000)
    mode:             str           = Field(...)
    status:           str           = Field(...)
    channel:          str           = Field(...)
    vehicle:          Optional[str] = Field(None, max_length=100)
    follow_up_date:   Optional[str] = Field(None)
    deal_closed_date: Optional[str] = Field(None)
    attendant:        Optional[str] = Field(None, max_length=80)
    quote_price:      Optional[str] = Field(None, max_length=30)
    travel_date:      Optional[str] = Field(None)
    return_date:      Optional[str] = Field(None)
    # ── Booked-only fields ──────────────────────────────────────────────────
    driver_name:      Optional[str] = Field(None, max_length=80)
    trip_from:        Optional[str] = Field(None, max_length=120)
    trip_to:          Optional[str] = Field(None, max_length=120)
    # ── Trip financials (shown when Booked) ─────────────────────────────────
    advance_cash:     Optional[str] = Field(None, max_length=20)
    advance_bank:     Optional[str] = Field(None, max_length=20)
    total_cash:       Optional[str] = Field(None, max_length=20)
    total_bank:       Optional[str] = Field(None, max_length=20)
    number_of_days:   Optional[str] = Field(None, max_length=10)
    decline_reason:   Optional[str] = Field(None, max_length=200)
    lead_receive_date: Optional[str] = Field(None, max_length=30)
    firm:             Optional[str] = Field(None, max_length=100)
    campaign:         Optional[str] = Field(None, max_length=100)

    @validator("mode", pre=True)
    def validate_mode(cls, v):
        if not v:
            raise ValueError("mode is required")
        if str(v).strip() not in MODE_VALUES:
            raise ValueError(f"mode must be one of: {', '.join(sorted(MODE_VALUES))}")
        return str(v).strip()

    @validator("status", pre=True)
    def validate_status(cls, v):
        if not v:
            raise ValueError("status is required")
        if str(v).strip() not in STATUS_VALUES:
            raise ValueError(f"status must be one of: {', '.join(sorted(STATUS_VALUES))}")
        return str(v).strip()

    @validator("channel", pre=True)
    def validate_channel(cls, v):
        if not v:
            raise ValueError("channel is required")
        if str(v).strip() not in CHANNEL_VALUES:
            raise ValueError(f"channel must be one of: {', '.join(sorted(CHANNEL_VALUES))}")
        return str(v).strip()

    @validator("follow_up_date", "deal_closed_date", "travel_date", "return_date", pre=True)
    def validate_date(cls, v):
        return _validate_date_str(v)

    @validator("contact", pre=True)
    def clean_contact(cls, v):
        if not v:
            raise ValueError("contact is required")
        digits = "".join(c for c in str(v) if c.isdigit())
        if len(digits) < 6:
            raise ValueError("contact must have at least 6 digits")
        return str(v).strip()

    @root_validator(skip_on_failure=True)
    def booked_fields_required(cls, values):
        """If status is Booked, driver_name, trip_from, trip_to are required."""
        if values.get("status") == "Booked":
            missing = []
            if not values.get("driver_name", "").strip() if values.get("driver_name") else True:
                missing.append("driver_name")
            if not values.get("trip_from", "").strip() if values.get("trip_from") else True:
                missing.append("trip_from")
            if not values.get("trip_to", "").strip() if values.get("trip_to") else True:
                missing.append("trip_to")
            if missing:
                raise ValueError(f"When status is Booked, these fields are required: {', '.join(missing)}")
        return values

    class Config:
        populate_by_name = True
        extra = "ignore"


class CRMEntryUpdate(CRMEntryCreate):
    """Full replacement update — same rules as create."""
    pass


class CRMFollowUpCreate(CRMEntryCreate):
    """Follow-up row — same schema, customer_name & contact are pre-filled."""
    pass


class CRMQueryParams(BaseModel):
    status:    Optional[str] = None
    channel:   Optional[str] = None
    start:     Optional[str] = None
    end:       Optional[str] = None
    search:    Optional[str] = Field(None, max_length=120)

    @validator("status", pre=True)
    def validate_status(cls, v):
        if not v or v == "all":
            return None
        if v not in STATUS_VALUES:
            raise ValueError(f"status must be one of: {', '.join(sorted(STATUS_VALUES))}")
        return v

    @validator("channel", pre=True)
    def validate_channel(cls, v):
        if not v or v == "all":
            return None
        if v not in CHANNEL_VALUES:
            raise ValueError(f"channel must be one of: {', '.join(sorted(CHANNEL_VALUES))}")
        return v

    @validator("start", "end", pre=True)
    def validate_date_filter(cls, v):
        return _validate_date_str(v)
