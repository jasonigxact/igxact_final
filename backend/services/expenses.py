"""services/expenses.py — Expenses sheet I/O"""
import logging, os, time
from typing import Optional
from fastapi import HTTPException
from services.sheets import open_worksheet_by_name

logger = logging.getLogger(__name__)

_TTL = 30
_cache: dict = {"data": None, "fetched_at": 0.0}

SHEET_NAME = "Expenses"
COLUMNS = ["date", "month", "year", "driver_salary", "insurance",
           "vehicle_repair", "road_permit", "other_taxes", "marketing", "misc", "notes"]

def _cache_valid():
    return _cache["data"] is not None and (time.monotonic() - _cache["fetched_at"]) < _TTL

def _invalidate():
    _cache["data"] = None; _cache["fetched_at"] = 0.0

def _ws():
    return open_worksheet_by_name(SHEET_NAME)

def _fetch_all():
    ws = _ws()
    try:
        rows = ws.get_all_values()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read Expenses sheet: {e}")
    if not rows:
        return []
    header = [h.strip().lower().replace(" ", "_") for h in rows[0]]
    result = []
    for idx, row in enumerate(rows[1:], start=2):
        if not any(str(v).strip() for v in row):
            continue
        d = {"_row": idx}
        for i, col in enumerate(header):
            d[col] = row[i] if i < len(row) else ""
        result.append(d)
    return result

def get_all_expenses():
    if _cache_valid():
        return _cache["data"]
    rows = _fetch_all()
    _cache["data"] = rows; _cache["fetched_at"] = time.monotonic()
    return rows

def create_expense(data: dict) -> dict:
    from datetime import datetime
    ws = _ws()
    date_str = data.get("date", "")
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        month = dt.strftime("%B")
        year  = str(dt.year)
    except Exception:
        month = ""; year = ""
    row = [
        date_str, month, year,
        data.get("driver_salary", ""),
        data.get("insurance", ""),
        data.get("vehicle_repair", ""),
        data.get("road_permit", ""),
        data.get("other_taxes", ""),
        data.get("marketing", ""),
        data.get("misc", ""),
        data.get("notes", ""),
    ]
    try:
        ws.append_row(row, value_input_option="USER_ENTERED")
        _invalidate()
        return {"msg": "Expense added", "date": date_str}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add expense: {e}")

def update_expense(row_num: int, data: dict) -> dict:
    ws = _ws()
    try:
        all_rows = ws.get_all_values()
        header = [h.strip().lower().replace(" ", "_") for h in all_rows[0]]
        for key, val in data.items():
            if key in header:
                col_idx = header.index(key) + 1
                ws.update_cell(row_num, col_idx, val or "")
        _invalidate()
        return {"msg": "Expense updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update expense: {e}")

def delete_expense(row_num: int) -> dict:
    ws = _ws()
    try:
        ws.delete_rows(row_num)
        _invalidate()
        return {"msg": "Expense deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete expense: {e}")
