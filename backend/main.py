import logging
import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from auth import router as auth_router
from expenses_router import expenses_router
from crm_router import crm_router
from records_router import records_router
from targets_router import targets_router
from middleware import RequestLoggingMiddleware
from schemas.trip import DashboardQueryParams, TripCreate, TripUpdate, TripQueryParams, VehicleCreate
from services.trips import (
    add_trip,
    add_vehicle,
    get_dashboard_data,
    get_sheet_columns,
    get_vehicles,
    get_vehicles_with_targets,
    set_vehicle_target,
    query_trips,
    update_trip,
)
from utils import require_admin, verify_token

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="IGXact API", version="2.2.0", docs_url=None, redoc_url=None)

# ─── Middleware (order matters — logging wraps everything) ────────────────────
app.add_middleware(RequestLoggingMiddleware)

from config import ALLOWED_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    max_age=600,
)

app.include_router(auth_router)
app.include_router(crm_router)
app.include_router(records_router)
app.include_router(targets_router)
app.include_router(expenses_router)


# ─── Global validation error handler ─────────────────────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    errors = [
        {"field": ".".join(str(l) for l in e["loc"][1:]), "msg": e["msg"]}
        for e in exc.errors()
    ]
    logger.warning(f"Validation error on {request.url.path}: {errors}")
    return JSONResponse(status_code=422, content={"detail": errors})


# ─── Global unhandled exception handler ──────────────────────────────────────
@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc!r}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ─── Debug credentials (REMOVE AFTER FIXING) ─────────────────────────────────
def _try_parse(s: str) -> bool:
    try:
        import json
        json.loads(s)
        return True
    except Exception:
        return False

@app.get("/debug-creds")
def debug_creds():
    import json
    secret_path = "/etc/secrets/google_creds.json"
    creds_env = os.getenv("GOOGLE_CREDS")

    secret_content = None
    secret_valid = False
    secret_error = None
    if os.path.exists(secret_path):
        try:
            with open(secret_path) as f:
                secret_content = f.read()
            secret_valid = _try_parse(secret_content)
        except Exception as e:
            secret_error = str(e)

    return {
        "env_var_present": bool(creds_env),
        "env_var_length": len(creds_env) if creds_env else 0,
        "env_var_valid_json": _try_parse(creds_env) if creds_env else False,
        "secret_file_exists": os.path.exists(secret_path),
        "secret_file_length": len(secret_content) if secret_content else 0,
        "secret_file_valid_json": secret_valid,
        "secret_file_error": secret_error,
    }


# ─── Vehicles ─────────────────────────────────────────────────────────────────
@app.get("/vehicles")
def list_vehicles(user=Depends(verify_token)):
    return {"vehicles": get_vehicles()}


@app.post("/vehicles", status_code=201)
def create_vehicle(body: VehicleCreate, user=Depends(verify_token)):
    return add_vehicle(body.name)


@app.get("/vehicles/targets")
def list_vehicle_targets(user=Depends(verify_token)):
    """Return all vehicles with their target amounts."""
    return {"vehicles": get_vehicles_with_targets()}


@app.put("/vehicles/{vehicle_name}/target")
def update_vehicle_target(vehicle_name: str, body: dict, user=Depends(require_admin)):
    """Set target amount for a specific vehicle."""
    target = float(body.get("target", 0) or 0)
    if target < 0:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Target must be positive")
    return set_vehicle_target(vehicle_name, target)


# ─── Trips ────────────────────────────────────────────────────────────────────
@app.post("/add-trip", status_code=201)
def create_trip(body: TripCreate, user=Depends(require_admin)):
    return add_trip(body.dict(by_alias=True))


@app.put("/update-trip/{trip_id}")
def edit_trip(trip_id: int, body: TripUpdate, user=Depends(verify_token)):
    if trip_id <= 0:
        raise HTTPException(status_code=400, detail="trip_id must be a positive integer")
    return update_trip(trip_id, body.dict(by_alias=True))


@app.get("/columns")
def list_columns(user=Depends(verify_token)):
    return get_sheet_columns()


# ─── Trip queries ─────────────────────────────────────────────────────────────
@app.get("/trips")
def get_trips(
    start:    str = Query(None),
    end:      str = Query(None),
    trip_id:  str = Query(None),
    mobile:   str = Query(None),
    user=Depends(require_admin),
):
    params = TripQueryParams(start=start, end=end, trip_id=trip_id, mobile=mobile)
    return query_trips(params.start, params.end, params.trip_id, params.mobile)


@app.get("/trips-view")
def trips_view(
    start:    str = Query(None),
    end:      str = Query(None),
    trip_id:  str = Query(None),
    mobile:   str = Query(None),
    user=Depends(verify_token),
):
    params = TripQueryParams(start=start, end=end, trip_id=trip_id, mobile=mobile)
    return query_trips(params.start, params.end, params.trip_id, params.mobile)


# ─── Calendar ────────────────────────────────────────────────────────────────
@app.get("/calendar")
def get_calendar(
    year:  int = Query(None),
    month: int = Query(None),
    user=Depends(verify_token),
):
    from services.sheets import load_trips_df
    import pandas as pd
    from datetime import datetime
    now = datetime.now()
    y = year  or now.year
    m = month or now.month

    df = load_trips_df()
    if df.empty:
        return {"trips": [], "year": y, "month": m}

    if "End date" in df.columns:
        df["End date parsed"] = pd.to_datetime(df["End date"], errors="coerce")
    else:
        df["End date parsed"] = pd.NaT

    # Include trips that OVERLAP the selected month
    # (started before month end AND ended after month start)
    if "Start Date" in df.columns:
        month_start = pd.Timestamp(year=y, month=m, day=1)
        month_end   = pd.Timestamp(year=y, month=m, day=pd.Timestamp(year=y, month=m, day=1).days_in_month)
        start_ok = df["Start Date"] <= month_end
        end_ok   = df["End date parsed"].fillna(df["Start Date"]) >= month_start
        df = df[start_ok & end_ok]

    # Remove cancelled trips from calendar
    if "Status" in df.columns:
        df = df[~df["Status"].str.lower().str.strip().isin(["cancelled", "canceled"])]

    trips = []
    for _, row in df.iterrows():
        start = row.get("Start Date")
        end   = row.get("End date parsed")
        trips.append({
            "trip_id":     str(row.get("trip id", "")),
            "customer":    str(row.get("Customer Name", "")),
            "from":        str(row.get("Trip From", "")),
            "to":          str(row.get("Trip TO", "")),
            "vehicle":     str(row.get("Vehicle Details", "")),
            "status":      str(row.get("Status", "")),
            "start_date":  start.strftime("%Y-%m-%d") if pd.notna(start) else "",
            "end_date":    end.strftime("%Y-%m-%d")   if pd.notna(end)   else "",
            "deal":        float(row.get("Deal Price", 0) or 0),
        })

    return {"trips": trips, "year": y, "month": m}


# ─── Dashboard ────────────────────────────────────────────────────────────────
@app.get("/data")
def get_data(
    year:     str = Query(None),
    month:    int = Query(None),
    status:   str = Query("all"),
    trip_id:  str = Query(None),
    mobile:   str = Query(None),
    user=Depends(verify_token),
):
    year_int = None if (not year or year == "all") else int(year)
    show_all = (year == "all")
    params = DashboardQueryParams(
        year=year_int, month=month, status=status, trip_id=trip_id, mobile=mobile
    )
    return get_dashboard_data(
        params.year, params.month, params.status, params.trip_id, params.mobile,
        show_all_years=show_all
    )


# ─── Health ───────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}
