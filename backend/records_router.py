"""
records_router.py
─────────────────
FastAPI router for Drivers, Cars, Attendants, and Fund Deposits endpoints.
Mount in main.py with: app.include_router(records_router)
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from schemas.drivers import DriverCreate, DriverUpdate
from schemas.cars import CarCreate, CarUpdate
from schemas.attendants import AttendantCreate, AttendantUpdate
from schemas.fund_deposit import FundDepositCreate

from services.drivers import (
    create_driver, get_all_drivers, update_driver, delete_driver, query_drivers
)
from services.cars import (
    create_car, get_all_cars, update_car, delete_car, query_cars
)
from services.attendants import (
    create_attendant, get_all_attendants, update_attendant, delete_attendant, query_attendants
)
from services.fund_deposits import (
    create_deposit, get_all_deposits, query_deposits
)

from utils import require_admin, verify_token

logger = logging.getLogger(__name__)

records_router = APIRouter(tags=["Records"])


# ══════════════════════════════════════════════════════════════════════════
# DRIVERS
# ══════════════════════════════════════════════════════════════════════════

@records_router.get("/drivers")
def list_drivers(
    search: str = Query(None),
    user=Depends(verify_token),
):
    rows = query_drivers(search=search)
    return {"drivers": rows, "total": len(rows)}


@records_router.post("/drivers", status_code=201)
def add_driver(body: DriverCreate, user=Depends(require_admin)):
    return create_driver(body.dict())


@records_router.put("/drivers/{row_number}")
def edit_driver(row_number: int, body: DriverUpdate, user=Depends(require_admin)):
    if row_number < 2:
        raise HTTPException(status_code=400, detail="row_number must be ≥ 2")
    return update_driver(row_number, body.dict())


@records_router.delete("/drivers/{row_number}")
def remove_driver(row_number: int, user=Depends(require_admin)):
    if row_number < 2:
        raise HTTPException(status_code=400, detail="row_number must be ≥ 2")
    return delete_driver(row_number)


# ══════════════════════════════════════════════════════════════════════════
# CARS
# ══════════════════════════════════════════════════════════════════════════

@records_router.get("/cars")
def list_cars(
    search: str = Query(None),
    user=Depends(verify_token),
):
    rows = query_cars(search=search)
    return {"cars": rows, "total": len(rows)}


@records_router.post("/cars", status_code=201)
def add_car(body: CarCreate, user=Depends(require_admin)):
    return create_car(body.dict())


@records_router.put("/cars/{row_number}")
def edit_car(row_number: int, body: CarUpdate, user=Depends(require_admin)):
    if row_number < 2:
        raise HTTPException(status_code=400, detail="row_number must be ≥ 2")
    return update_car(row_number, body.dict())


@records_router.delete("/cars/{row_number}")
def remove_car(row_number: int, user=Depends(require_admin)):
    if row_number < 2:
        raise HTTPException(status_code=400, detail="row_number must be ≥ 2")
    return delete_car(row_number)


# ══════════════════════════════════════════════════════════════════════════
# ATTENDANTS
# ══════════════════════════════════════════════════════════════════════════

@records_router.get("/attendants")
def list_attendants(
    search: str = Query(None),
    user=Depends(verify_token),
):
    rows = query_attendants(search=search)
    return {"attendants": rows, "total": len(rows)}


@records_router.post("/attendants", status_code=201)
def add_attendant(body: AttendantCreate, user=Depends(require_admin)):
    return create_attendant(body.dict())


@records_router.put("/attendants/{row_number}")
def edit_attendant(row_number: int, body: AttendantUpdate, user=Depends(require_admin)):
    if row_number < 2:
        raise HTTPException(status_code=400, detail="row_number must be ≥ 2")
    return update_attendant(row_number, body.dict())


@records_router.delete("/attendants/{row_number}")
def remove_attendant(row_number: int, user=Depends(require_admin)):
    if row_number < 2:
        raise HTTPException(status_code=400, detail="row_number must be ≥ 2")
    return delete_attendant(row_number)


# ══════════════════════════════════════════════════════════════════════════
# FUND DEPOSITS
# ══════════════════════════════════════════════════════════════════════════

@records_router.get("/fund-deposits")
def list_deposits(
    start:  str = Query(None),
    end:    str = Query(None),
    search: str = Query(None),
    user=Depends(verify_token),
):
    rows = query_deposits(start=start, end=end, search=search, use_cache=False)
    return {"deposits": rows, "total": len(rows)}


@records_router.post("/fund-deposits", status_code=201)
def add_deposit(body: FundDepositCreate, user=Depends(verify_token)):
    return create_deposit(body.dict())
