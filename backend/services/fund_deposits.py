"""
services/fund_deposits.py
─────────────────────────
Fund Deposit management logic. Google Sheets is the ONLY store.
Sheet tab name: "FundDeposits"
"""

import logging
import os
import time
from datetime import datetime
from typing import Any, Optional

from fastapi import HTTPException
from services.sheets import open_worksheet_by_name

logger = logging.getLogger(__name__)

_TTL = int(os.getenv("DEPOSITS_CACHE_TTL_SECONDS", "60"))
_cache: dict[str, Any] = {"data": None, "fetched_at": 0.0}

SHEET_NAME = "FundDeposits"

COLUMNS = [
    "timestamp",
    "deposit_date",
    "deposited_by",
    "amount",
    "mode",
    "reference",
    "notes",
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


def _now_ts() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")


def _fetch_all_raw() -> list[dict]:
    ws = _ensure_sheet()
    try:
        all_rows = ws.get_all_values()
    except Exception as e:
        logger.error(f"{SHEET_NAME} sheet read error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to read {SHEET_NAME} data")

    if not all_rows:
        return []

    # Detect if first row is a header row or data row
    # If first cell matches our first column name it's a header — skip it
    first_row = [str(v).strip().lower().replace(" ", "_") for v in all_rows[0]]
    if first_row[0] == COLUMNS[0].lower():
        data_rows = all_rows[1:]
        start_idx = 2
    else:
        # No header row — all rows are data
        data_rows = all_rows
        start_idx = 1

    result = []
    for idx, row in enumerate(data_rows, start=start_idx):
        if not any(str(v).strip() for v in row):
            continue
        d: dict = {"_row": idx}
        for i, col in enumerate(COLUMNS):
            d[col] = row[i] if i < len(row) else ""
        result.append(d)
    return result


def get_all_deposits(use_cache: bool = True) -> list[dict]:
    if use_cache and _cache_valid():
        return _cache["data"]
    try:
        rows = _fetch_all_raw()
        _cache["data"] = rows
        _cache["fetched_at"] = time.monotonic()
        return rows
    except HTTPException:
        if _cache["data"] is not None:
            logger.warning("FundDeposits Sheets fetch failed — returning stale cache")
            return _cache["data"]
        raise


def create_deposit(entry: dict) -> dict:
    entry["timestamp"] = _now_ts()
    row = _entry_to_row(entry)
    ws = _ensure_sheet()
    try:
        ws.append_row(row, value_input_option="USER_ENTERED")
    except Exception as e:
        logger.error(f"Deposit append error: {e}")
        raise HTTPException(status_code=500, detail="Failed to write deposit to Google Sheets")
    _invalidate_cache()
    logger.info(f"Deposit created: {entry.get('amount')} by {entry.get('deposited_by')}")
    return {"msg": "Fund deposit recorded successfully", "timestamp": entry["timestamp"]}


def query_deposits(start: Optional[str] = None, end: Optional[str] = None, search: Optional[str] = None, use_cache: bool = True) -> list[dict]:
    rows = get_all_deposits(use_cache=use_cache)
    if start:
        try:
            start_dt = datetime.strptime(start, "%Y-%m-%d").date()
            rows = [r for r in rows if _parse_date(r.get("deposit_date", "")) and _parse_date(r.get("deposit_date", "")) >= start_dt]
        except ValueError:
            pass
    if end:
        try:
            end_dt = datetime.strptime(end, "%Y-%m-%d").date()
            rows = [r for r in rows if _parse_date(r.get("deposit_date", "")) and _parse_date(r.get("deposit_date", "")) <= end_dt]
        except ValueError:
            pass
    if search:
        q = search.strip().lower()
        rows = [r for r in rows if q in r.get("deposited_by", "").lower() or q in r.get("reference", "").lower()]
    return rows


def _parse_date(value: str):
    if not value:
        return None
    from datetime import date as dt
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%m/%d/%Y", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    return None
