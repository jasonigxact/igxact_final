"""
schemas/cars.py
───────────────
Pydantic models for Car request validation.
"""

from typing import Optional
from pydantic import BaseModel, Field, validator


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


class CarCreate(BaseModel):
    registration_number:    str           = Field(..., min_length=1, max_length=30)
    chasis_number:          Optional[str] = Field(None, max_length=50)
    insurance_expiry:       Optional[str] = Field(None)
    local_permit_date:      Optional[str] = Field(None)
    national_permit_date:   Optional[str] = Field(None)

    @validator("insurance_expiry", "local_permit_date", "national_permit_date", pre=True)
    def validate_date(cls, v):
        return _validate_date_str(v)

    class Config:
        populate_by_name = True
        extra = "ignore"


class CarUpdate(CarCreate):
    pass
