"""
services/cars.py
────────────────
Car management logic. Google Sheets is the ONLY store.
Sheet tab name: "Cars"
"""

import logging
import os
import time
from typing import Any, Optional

from fastapi import HTTPException
from services.sheets import open_worksheet_by_name

logger = logging.getLogger(__name__)

_TTL = int(os.getenv("CARS_CACHE_TTL_SECONDS", "60"))
_cache: dict[str, Any] = {"data": None, "fetched_at": 0.0}

SHEET_NAME = "cars"

COLUMNS = [
    "registration_number",
    "chasis_number",
    "insurance_expiry",
    "local_permit_date",
    "national_permit_date",
]


def _cache_valid() -> bool:
    return _cache["data"] is not None and (time.monotonic() - _cache["fetched_at"]) < _TTL


def _invalidate_cache() -> None:
    _cache["data"] = None
    _cache["fetched_at"] = 0.0


def _ensure_sheet():
    from services.sheets import get_client
    from config import SHEET_URL
    client = get_client()
    try:
        wb = client.open_by_url(f"{SHEET_URL}/edit")
        return wb.worksheet(SHEET_NAME)
    except Exception as e:
        logger.error(f"Failed to open sheet '{SHEET_NAME}': {e}")
        raise HTTPException(status_code=500, detail=f"Could not open sheet '{SHEET_NAME}': {e}")


def _row_to_dict(row: list, row_index: int) -> dict:
    d: dict = {"_row": row_index}
    for i, col in enumerate(COLUMNS):
        d[col] = row[i] if i < len(row) else ""
    return d


def _entry_to_row(entry: dict) -> list:
    return [entry.get(col, "") or "" for col in COLUMNS]


def _fetch_all_raw() -> list[dict]:
    ws = _ensure_sheet()
    try:
        all_rows = ws.get_all_values()
    except Exception as e:
        logger.error(f"{SHEET_NAME} sheet read error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to read {SHEET_NAME} data")

    if not all_rows:
        return []
    data_rows = all_rows[1:]
    result = []
    for idx, row in enumerate(data_rows, start=2):
        if not any(str(v).strip() for v in row):
            continue
        result.append(_row_to_dict(row, idx))
    return result


def get_all_cars(use_cache: bool = True) -> list[dict]:
    if use_cache and _cache_valid():
        return _cache["data"]
    try:
        rows = _fetch_all_raw()
        _cache["data"] = rows
        _cache["fetched_at"] = time.monotonic()
        return rows
    except HTTPException:
        if _cache["data"] is not None:
            logger.warning("Cars Sheets fetch failed — returning stale cache")
            return _cache["data"]
        raise


def create_car(entry: dict) -> dict:
    row = _entry_to_row(entry)
    ws = _ensure_sheet()
    try:
        ws.append_row(row, value_input_option="USER_ENTERED")
    except Exception as e:
        logger.error(f"Car append error: {e}")
        raise HTTPException(status_code=500, detail="Failed to write car to Google Sheets")
    _invalidate_cache()
    logger.info(f"Car created: {entry.get('registration_number')}")
    return {"msg": "Car created successfully", "registration_number": entry.get("registration_number")}


def update_car(row_number: int, entry: dict) -> dict:
    if row_number < 2:
        raise HTTPException(status_code=400, detail="Invalid row number")
    row = _entry_to_row(entry)
    ws = _ensure_sheet()
    try:
        col_letter = chr(ord("A") + len(COLUMNS) - 1)
        cell_range = f"A{row_number}:{col_letter}{row_number}"
        ws.update(cell_range, [row], value_input_option="USER_ENTERED")
    except Exception as e:
        logger.error(f"Car update error (row {row_number}): {e}")
        raise HTTPException(status_code=500, detail="Failed to update car in Google Sheets")
    _invalidate_cache()
    return {"msg": "Car updated successfully", "row": row_number}


def delete_car(row_number: int) -> dict:
    if row_number < 2:
        raise HTTPException(status_code=400, detail="Invalid row number")
    ws = _ensure_sheet()
    try:
        ws.delete_rows(row_number)
    except Exception as e:
        logger.error(f"Car delete error (row {row_number}): {e}")
        raise HTTPException(status_code=500, detail="Failed to delete car")
    _invalidate_cache()
    return {"msg": "Car deleted", "row": row_number}


def query_cars(search: Optional[str] = None) -> list[dict]:
    rows = get_all_cars()
    if search:
        q = search.strip().lower()
        rows = [r for r in rows if q in r.get("registration_number", "").lower() or q in r.get("chasis_number", "").lower()]
    return rows
