"""
targets_router.py
─────────────────
FastAPI router for monthly target CRUD.
"""

import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from utils import require_admin, verify_token
from services.targets import get_all_targets, set_target, get_targets_for_year

logger = logging.getLogger(__name__)
targets_router = APIRouter(tags=["Targets"])

MONTH_NAMES = ["January","February","March","April","May","June",
               "July","August","September","October","November","December"]


class TargetSet(BaseModel):
    year: int
    month_num: int   # 1-12
    target_amount: float


@targets_router.get("/targets")
def list_targets(year: int = None, user=Depends(verify_token)):
    if year:
        data = get_targets_for_year(year)
        # Return as list for frontend ease
        result = []
        for m in range(1, 13):
            result.append({
                "year": year,
                "month_num": m,
                "month_name": MONTH_NAMES[m - 1],
                "target_amount": data.get(m, 250_000),
            })
        return {"targets": result}
    return {"targets": get_all_targets()}


@targets_router.post("/targets")
def upsert_target(body: TargetSet, user=Depends(require_admin)):
    if not (1 <= body.month_num <= 12):
        raise HTTPException(status_code=400, detail="month_num must be 1-12")
    if body.target_amount < 0:
        raise HTTPException(status_code=400, detail="target_amount must be positive")
    month_name = MONTH_NAMES[body.month_num - 1]
    return set_target(body.year, body.month_num, month_name, body.target_amount)
