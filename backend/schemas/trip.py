"""
schemas/trip.py
───────────────
Pydantic models for trip request validation.

Design decisions:
  - Required fields: Customer Name, Trip From, Trip TO, Deal Price, Vehicle Details
  - All other fields: optional with sensible defaults
  - Extra fields (Net Profit, Profit Percentage, etc sent by frontend): silently ignored
  - Dates: accept MM/DD/YYYY (what frontend sends) and YYYY-MM-DD
  - Status: only "booked", "progress", "completed", "cancelled" accepted
  - Profit fields sent by frontend are DROPPED — recalculated server-side
"""

from typing import Optional
from pydantic import BaseModel, Field, validator


class TripCreate(BaseModel):
    # ── Required ──────────────────────────────────────────────────────────────
    customer_name:   str   = Field(..., alias="Customer Name",    min_length=1, max_length=120)
    trip_from:       str   = Field(..., alias="Trip From",        min_length=1, max_length=100)
    trip_to:         str   = Field(..., alias="Trip TO",          min_length=1, max_length=100)
    deal_price:      float = Field(..., alias="Deal Price",       ge=0)
    vehicle_details: Optional[str] = Field(None, alias="Vehicle Details", max_length=100)

    # ── Optional contact ──────────────────────────────────────────────────────
    contact_number: Optional[str] = Field(None, alias="Cust. Contact Number", max_length=20)

    # ── Dates — optional, accepts MM/DD/YYYY or YYYY-MM-DD ───────────────────
    start_date: Optional[str] = Field(None, alias="Start Date")
    end_date:   Optional[str] = Field(None, alias="End date")

    # ── Expenses — all optional, default 0 ───────────────────────────────────
    fuel:             float = Field(0, alias="Fuel",             ge=0)
    tolls_taxes:      float = Field(0, alias="Tolls & Taxes",    ge=0)
    parking:          float = Field(0, alias="Parking",          ge=0)
    driver_allowance: float = Field(0, alias="Driver Allowance", ge=0)
    sales_commission: float = Field(0, alias="Sales Commission", ge=0)
    other_expenses:   float = Field(0, alias="Other Expenses",   ge=0)

    # ── Payment ───────────────────────────────────────────────────────────────
    advance_cash:    float = Field(0, alias="Booking Amt/Advance Cash",  ge=0)
    advance_bank:    float = Field(0, alias="Booking Amt/Advance Bank",  ge=0)
    pay2_cash:       float = Field(0, alias="2nd Payment Cash Bank",     ge=0)
    pay2_bank:       float = Field(0, alias="2nd Payment Bank",          ge=0)
    final_cash:      float = Field(0, alias="Final Payment Mode Cash",   ge=0)
    final_bank:      float = Field(0, alias="Final Payment Mode Bank",   ge=0)
    total_cash:      float = Field(0, alias="Total Cash",                ge=0)
    total_bank:      float = Field(0, alias="Total Bank",                ge=0)
    total:           float = Field(0, alias="Total",                     ge=0)
    per_day_cost:    float = Field(0, alias="Per Day Cost",              ge=0)

    # ── Meta ──────────────────────────────────────────────────────────────────
    number_of_days:  int            = Field(1,        alias="Number of Days", ge=0, le=365)
    status:          str            = Field("booked", alias="Status")
    driver_name:     Optional[str]  = Field(None,     alias="Driver Name",    max_length=100)
    driver_contact:  Optional[str]  = Field(None,     alias="Driver Contact", max_length=20)
    remarks:         Optional[str]  = Field(None,     alias="Remarks",        max_length=500)

    @validator("status", pre=True)
    def validate_status(cls, v):
        if not v:
            return "booked"
        allowed = {"booked", "progress", "completed", "cancelled", "done"}
        cleaned = str(v).lower().strip()
        if cleaned not in allowed:
            raise ValueError(f"Status must be one of: {', '.join(sorted(allowed))}")
        return cleaned

    @validator("start_date", "end_date", pre=True)
    def validate_date(cls, v):
        if not v:
            return v
        from datetime import datetime
        for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
            try:
                datetime.strptime(v, fmt)
                return v
            except ValueError:
                continue
        raise ValueError(f"Date '{v}' must be MM/DD/YYYY or YYYY-MM-DD")

    @validator("contact_number", pre=True)
    def clean_phone(cls, v):
        if not v:
            return v
        digits = "".join(c for c in str(v) if c.isdigit())
        if len(digits) < 6:
            raise ValueError("Contact number must have at least 6 digits")
        return str(v).strip()

    @validator("number_of_days", pre=True)
    def coerce_days(cls, v):
        if not v and v != 0:
            return 1
        try:
            return int(float(str(v)))
        except (ValueError, TypeError):
            return 1

    @validator("deal_price", "fuel", "tolls_taxes", "parking",
               "driver_allowance", "sales_commission", "other_expenses",
               "advance_cash", "advance_bank", "pay2_cash", "pay2_bank",
               "final_cash", "final_bank", "total_cash", "total_bank",
               "total", "per_day_cost",
               pre=True)
    def coerce_numeric(cls, v):
        if v is None or v == "":
            return 0.0
        try:
            return float(str(v).replace(",", "").replace("₹", "").strip())
        except (ValueError, TypeError):
            return 0.0

    @validator("vehicle_details", "customer_name", "trip_from", "trip_to",
               "driver_name", "driver_contact", "remarks",
               pre=True, always=True)
    def coerce_to_str(cls, v):
        if v is None or v == "" or v == []:
            return ""
        return str(v).strip()

    class Config:
        populate_by_name = True  # accept both field name and alias
        extra = "ignore"         # silently drop unknown fields (Net Profit, Profit %, etc)


class TripUpdate(TripCreate):
    """Full replacement update — same rules as create."""
    pass


class VehicleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)

    @validator("name")
    def strip_name(cls, v):
        return v.strip()


class TripQueryParams(BaseModel):
    start:   Optional[str] = None
    end:     Optional[str] = None
    trip_id: Optional[str] = None
    mobile:  Optional[str] = Field(None, max_length=20)

    @validator("start", "end", pre=True)
    def validate_date_filter(cls, v):
        if not v:
            return None
        from datetime import datetime
        try:
            datetime.strptime(v, "%Y-%m-%d")
            return v
        except ValueError:
            raise ValueError("Date filter must be YYYY-MM-DD")


class DashboardQueryParams(BaseModel):
    year:    Optional[int] = Field(None, ge=2000, le=2100)
    month:   Optional[int] = Field(None, ge=1,    le=12)
    status:  str           = Field("all")
    trip_id: Optional[str] = None
    mobile:  Optional[str] = Field(None, max_length=20)

    @validator("status", pre=True)
    def validate_status(cls, v):
        if not v:
            return "all"
        allowed = {"all", "completed", "progress", "booked", "done"}
        if str(v) not in allowed:
            raise ValueError(f"status must be one of: {', '.join(sorted(allowed))}")
        return str(v)
