"""
schemas/crm.py
──────────────
Pydantic models for CRM request validation.
Google Sheets is the ONLY database — no SQL models here.
"""

from typing import Optional
from pydantic import BaseModel, Field


STATUS_VALUES = {"Enquiry", "Booked", "Interested", "Super Interested", "Trip Decline", "Cancelled", "Not Interested"}


class CRMEntryCreate(BaseModel):
    customer_name:     str           = Field(..., min_length=1, max_length=120)
    contact:           str           = Field(..., min_length=1, max_length=30)
    description:       Optional[str] = Field(None, max_length=2000)
    mode:              Optional[str] = Field(None, max_length=50)
    status:            Optional[str] = Field("Enquiry", max_length=50)
    channel:           Optional[str] = Field(None, max_length=100)
    vehicle:           Optional[str] = Field(None, max_length=100)
    follow_up_date:    Optional[str] = Field(None, max_length=30)
    deal_closed_date:  Optional[str] = Field(None, max_length=30)
    attendant:         Optional[str] = Field(None, max_length=80)
    quote_price:       Optional[str] = Field(None, max_length=30)
    travel_date:       Optional[str] = Field(None, max_length=30)
    return_date:       Optional[str] = Field(None, max_length=30)
    driver_name:       Optional[str] = Field(None, max_length=80)
    trip_from:         Optional[str] = Field(None, max_length=120)
    trip_to:           Optional[str] = Field(None, max_length=120)
    advance_cash:      Optional[str] = Field(None, max_length=20)
    advance_bank:      Optional[str] = Field(None, max_length=20)
    total_cash:        Optional[str] = Field(None, max_length=20)
    total_bank:        Optional[str] = Field(None, max_length=20)
    number_of_days:    Optional[str] = Field(None, max_length=10)
    decline_reason:    Optional[str] = Field(None, max_length=200)
    lead_receive_date: Optional[str] = Field(None, max_length=30)
    firm:              Optional[str] = Field(None, max_length=100)
    campaign:          Optional[str] = Field(None, max_length=100)
    entry_type:        Optional[str] = Field(None, max_length=20)  # "new" or "followup"
    enquiry_id:        Optional[str] = Field(None, max_length=30)  # e.g. ENQ-20260626-001

    class Config:
        populate_by_name = True
        extra = "ignore"


class CRMEntryUpdate(CRMEntryCreate):
    pass


class CRMFollowUpCreate(CRMEntryCreate):
    pass


class CRMQueryParams(BaseModel):
    status:  Optional[str] = None
    channel: Optional[str] = None
    start:   Optional[str] = None
    end:     Optional[str] = None
    search:  Optional[str] = Field(None, max_length=120)

    class Config:
        extra = "ignore"
