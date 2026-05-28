"""schemas/expenses.py"""
from typing import Optional
from pydantic import BaseModel, Field

class ExpenseCreate(BaseModel):
    date:           str           = Field(..., description="YYYY-MM-DD")
    driver_salary:  Optional[str] = Field(None)
    insurance:      Optional[str] = Field(None)
    vehicle_repair: Optional[str] = Field(None)
    road_permit:    Optional[str] = Field(None)
    other_taxes:    Optional[str] = Field(None)
    marketing:      Optional[str] = Field(None)
    misc:           Optional[str] = Field(None)
    notes:          Optional[str] = Field(None, max_length=500)

    class Config:
        extra = "ignore"

class ExpenseUpdate(ExpenseCreate):
    pass
