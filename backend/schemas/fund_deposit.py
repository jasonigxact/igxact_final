"""
schemas/fund_deposit.py
───────────────────────
Pydantic models for Fund Deposit request validation.
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


class FundDepositCreate(BaseModel):
    deposit_date:   str           = Field(..., description="Date of deposit YYYY-MM-DD")
    deposited_by:   str           = Field(..., min_length=1, max_length=120)
    amount:         str           = Field(..., min_length=1, max_length=20)
    mode:           str           = Field(..., description="Cash or Bank")
    reference:      Optional[str] = Field(None, max_length=100)
    notes:          Optional[str] = Field(None, max_length=500)

    @validator("deposit_date", pre=True)
    def validate_date(cls, v):
        return _validate_date_str(v)

    @validator("mode", pre=True)
    def validate_mode(cls, v):
        if not v:
            raise ValueError("mode is required")
        if str(v).strip() not in {"Cash", "Bank"}:
            raise ValueError("mode must be Cash or Bank")
        return str(v).strip()

    class Config:
        populate_by_name = True
        extra = "ignore"
