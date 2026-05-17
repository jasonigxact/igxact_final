"""
services/targets.py
───────────────────
Monthly target management — per vehicle + overall total.
Stored in a "Targets" sheet tab.
Columns: year, month_num, month_name, vehicle, target_amount
  - vehicle = "" means overall/fallback target
  - vehicle = "3521" means target for that specific vehicle
"""

import logging
import time
from fastapi import HTTPException
from config import SHEET_URL

logger = logging.getLogger(__name__)

SHEET_NAME = "Targets"
COLUMNS = ["year", "month_num", "month_name", "vehicle", "target_amount"]

_cache: dict = {"data": None, "fetched_at": 0.0}
_TTL = 60


def _cache_valid():
    return _cache["data"] is not None and (time.monotonic() - _cache["fetched_at"]) < _TTL


def _invalidate_cache():
    _cache["data"] = None
    _cache["fetched_at"] = 0.0


def _ensure_sheet():
    from services.sheets import get_client
    client = get_client()
    try:
        wb = client.open_by_url(f"{SHEET_URL}/edit")
        return wb.worksheet(SHEET_NAME)
    except Exception as e:
        logger.error(f"Failed to open {SHEET_NAME} sheet: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Could not open Targets sheet. Please create a tab named '{SHEET_NAME}' "
                   f"with columns: year, month_num, month_name, vehicle, target_amount"
        )


def get_all_targets() -> list[dict]:
    if _cache_valid():
        return _cache["data"]
    ws = _ensure_sheet()
    try:
        all_rows = ws.get_all_values()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read Targets: {e}")

    if not all_rows:
        return []

    header = [h.strip().lower().replace(" ", "_") for h in all_rows[0]]
    result = []
    for idx, row in enumerate(all_rows[1:], start=2):
        if not any(str(v).strip() for v in row):
            continue
        d = {"_row": idx}
        for i, col in enumerate(header):
            d[col] = row[i] if i < len(row) else ""
        result.append(d)

    _cache["data"] = result
    _cache["fetched_at"] = time.monotonic()
    return result


def _match(r: dict, year: int, month_num: int, vehicle: str) -> bool:
    try:
        return (
            int(float(r.get("year", 0))) == year
            and int(float(r.get("month_num", 0))) == month_num
            and str(r.get("vehicle", "")).strip().lower() == vehicle.strip().lower()
        )
    except (ValueError, TypeError):
        return False


def get_total_target_for_month(year: int, month_num: int) -> float:
    rows = get_all_targets()
    vehicle_targets = {}
    overall = None
    for r in rows:
        try:
            if int(float(r.get("year", 0))) != year:
                continue
            if int(float(r.get("month_num", 0))) != month_num:
                continue
            v = str(r.get("vehicle", "")).strip()
            amt = float(r.get("target_amount", 0) or 0)
            if v == "":
                overall = amt
            else:
                vehicle_targets[v] = amt
        except (ValueError, TypeError):
            continue

    if vehicle_targets:
        return sum(vehicle_targets.values())
    if overall is not None:
        return overall
    return 0.0


def set_target(year: int, month_num: int, month_name: str, target_amount: float, vehicle: str = "") -> dict:
    ws = _ensure_sheet()
    rows = get_all_targets()

    existing_row = None
    for r in rows:
        if _match(r, year, month_num, vehicle):
            existing_row = r["_row"]
            break

    row_data = [str(year), str(month_num), month_name, vehicle, str(target_amount)]

    try:
        if existing_row:
            ws.update(f"A{existing_row}:E{existing_row}", [row_data], value_input_option="USER_ENTERED")
        else:
            ws.append_row(row_data, value_input_option="USER_ENTERED")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save target: {e}")

    _invalidate_cache()
    return {"msg": "Target saved", "year": year, "month_num": month_num, "vehicle": vehicle, "target_amount": target_amount}


def get_targets_for_year(year: int) -> dict:
    rows = get_all_targets()
    MONTH_NAMES = ["January","February","March","April","May","June",
                   "July","August","September","October","November","December"]
    result = {m: {"month_num": m, "month_name": MONTH_NAMES[m-1], "overall": 0, "vehicles": {}, "total": 250_000} for m in range(1, 13)}

    for r in rows:
        try:
            if int(float(r.get("year", 0))) != year:
                continue
            mn = int(float(r.get("month_num", 0)))
            v = str(r.get("vehicle", "")).strip()
            amt = float(r.get("target_amount", 0) or 0)
            if v == "":
                result[mn]["overall"] = amt
            else:
                result[mn]["vehicles"][v] = amt
        except (ValueError, TypeError):
            continue

    for m in result:
        if result[m]["vehicles"]:
            result[m]["total"] = sum(result[m]["vehicles"].values())
        elif result[m]["overall"] > 0:
            result[m]["total"] = result[m]["overall"]

    return result
