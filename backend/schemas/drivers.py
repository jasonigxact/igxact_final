"""
schemas/drivers.py
──────────────────
Pydantic models for Driver request validation.
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


class DriverCreate(BaseModel):
    name:                    str           = Field(..., min_length=1, max_length=120)
    father_name:             Optional[str] = Field(None, max_length=120)
    age:                     Optional[str] = Field(None, max_length=10)
    dob:                     Optional[str] = Field(None)
    mobile_num:              str           = Field(..., min_length=6, max_length=20)
    mobile_num2:             Optional[str] = Field(None, max_length=20)
    present_address:         Optional[str] = Field(None, max_length=500)
    permanent_address:       Optional[str] = Field(None, max_length=500)
    aadhaar_number:          Optional[str] = Field(None, max_length=20)
    driving_licence_number:  Optional[str] = Field(None, max_length=30)
    dl_expiry:               Optional[str] = Field(None)

    @validator("dob", "dl_expiry", pre=True)
    def validate_date(cls, v):
        return _validate_date_str(v)

    class Config:
        populate_by_name = True
        extra = "ignore"


class DriverUpdate(DriverCreate):
    pass
