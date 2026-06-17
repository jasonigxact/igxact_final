"""
services/crm.py
───────────────
CRM business logic.  Google Sheets is the ONLY store.

Sheet layout (tab name: "CRM"):
    A  timestamp
    B  customer_name
    C  contact
    D  description
    E  mode
    F  status
    G  channel
    H  follow_up_date
    I  deal_closed_date
    J  attendant
    K  vehicle

Vehicle list is read from the existing "Vehichles" worksheet
(kept consistent with existing spelling in trips.py).

Caching strategy
────────────────
 • A module-level dict (_cache) holds: data, fetched_at, ttl
 • Default TTL = 60 s (configurable via CRM_CACHE_TTL_SECONDS env var)
 • Cache is invalidated immediately on any write (append / update)
 • On API failure the stale cache is returned with a warning header
   (handled at the route layer)
"""

import logging
import os
import time
from datetime import datetime, date
from typing import Any, Optional

from fastapi import HTTPException

from services.sheets import open_worksheet_by_name

logger = logging.getLogger(__name__)

# ── Cache ──────────────────────────────────────────────────────────────────────

_CRM_TTL = int(os.getenv("CRM_CACHE_TTL_SECONDS", "60"))

_cache: dict[str, Any] = {
    "data": None,
    "fetched_at": 0.0,
}


def _cache_valid() -> bool:
    return (
        _cache["data"] is not None
        and (time.monotonic() - _cache["fetched_at"]) < _CRM_TTL
    )


def _invalidate_cache() -> None:
    _cache["data"] = None
    _cache["fetched_at"] = 0.0


# ── Sheet constants ────────────────────────────────────────────────────────────

CRM_SHEET_NAME = "CRM"

CRM_COLUMNS = [
    "timestamp",
    "customer_name",
    "contact",
    "description",
    "mode",
    "status",
    "channel",
    "follow_up_date",
    "deal_closed_date",
    "attendant",
    "vehicle",
    "quote_price",
    "travel_date",
    "return_date",
    "driver_name",
    "trip_from",
    "trip_to",
    "advance_cash",
    "advance_bank",
    "total_cash",
    "total_bank",
    "number_of_days",
    "decline_reason",
    "lead_receive_date",
    "firm",
    "campaign",
]


# ── Helpers ────────────────────────────────────────────────────────────────────

def _ensure_crm_sheet():
    """Open (and lazily create) the CRM worksheet."""
    try:
        return open_worksheet_by_name(CRM_SHEET_NAME)
    except HTTPException:
        # Sheet doesn't exist — create it
        from services.sheets import get_client, SHEET_URL
        client = get_client()
        try:
            wb = client.open_by_url(f"{SHEET_URL}/edit")
            ws = wb.add_worksheet(title=CRM_SHEET_NAME, rows=1000, cols=len(CRM_COLUMNS))
            ws.append_row(CRM_COLUMNS)
            logger.info("CRM sheet created with headers")
            return ws
        except Exception as e:
            logger.error(f"Failed to create CRM sheet: {e}")
            raise HTTPException(status_code=500, detail="Could not create CRM sheet")


def _row_to_dict(row: list, row_index: int) -> dict:
    """Map a raw sheet row (list) → dict using CRM_COLUMNS as keys."""
    d: dict = {"_row": row_index}  # 1-based sheet row number (for updates)
    for i, col in enumerate(CRM_COLUMNS):
        d[col] = row[i] if i < len(row) else ""
    return d


def _now_ts() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")


def _entry_to_row(entry: dict) -> list:
    """Convert a validated entry dict → ordered list matching CRM_COLUMNS."""
    return [entry.get(col, "") or "" for col in CRM_COLUMNS]


# ── Read ───────────────────────────────────────────────────────────────────────

def _fetch_all_raw() -> list[dict]:
    """
    Fetch all CRM rows from Google Sheets (bypasses cache).
    Returns list of dicts with _row key (1-based sheet row index).
    """
    ws = _ensure_crm_sheet()
    try:
        all_rows = ws.get_all_values()
    except Exception as e:
        logger.error(f"CRM sheet read error: {e}")
        raise HTTPException(status_code=500, detail="Failed to read CRM data from Google Sheets")

    if not all_rows:
        return []

    # First row must be header — skip it
    data_rows = all_rows[1:]
    result = []
    for sheet_row_idx, row in enumerate(data_rows, start=2):  # row 1 = header
        if not any(str(v).strip() for v in row):
            continue  # skip entirely blank rows
        result.append(_row_to_dict(row, sheet_row_idx))
    return result


def get_all_crm_entries(use_cache: bool = True) -> list[dict]:
    """
    Return all CRM entries.
    Uses in-memory cache to reduce Sheets API calls.
    Falls back to stale cache if a fresh fetch fails.
    """
    if use_cache and _cache_valid():
        return _cache["data"]

    try:
        rows = _fetch_all_raw()
        _cache["data"] = rows
        _cache["fetched_at"] = time.monotonic()
        return rows
    except HTTPException:
        if _cache["data"] is not None:
            logger.warning("CRM Sheets fetch failed — returning stale cache")
            return _cache["data"]
        raise


# ── Write ──────────────────────────────────────────────────────────────────────

def _auto_create_trip_if_booked(entry: dict) -> None:
    """
    When a CRM entry has status == 'Booked', automatically append
    a matching row to the main Trips sheet.
    Maps CRM fields → Trips sheet column names.
    Non-critical: logs errors but never raises so CRM save is unaffected.
    """
    if entry.get("status", "").strip() != "Booked":
        return

    def _to_sheet_date(d: str) -> str:
        """Convert YYYY-MM-DD (HTML date input) → MM/DD/YYYY (sheet format)."""
        try:
            from datetime import datetime
            return datetime.strptime(d.strip(), "%Y-%m-%d").strftime("%m/%d/%Y")
        except Exception:
            return d  # pass through unchanged if already in correct format or empty

    try:
        from services.trips import add_trip
        trip_data = {
            "Customer Name":              entry.get("customer_name", ""),
            "Cust. Contact Number":       entry.get("contact", ""),
            "Trip From":                  entry.get("trip_from", ""),
            "Trip TO":                    entry.get("trip_to", ""),
            "Start Date":                 _to_sheet_date(entry.get("travel_date", "")),
            "End date":                   _to_sheet_date(entry.get("return_date", "")),
            "Vehicle Details":            entry.get("vehicle", ""),
            "Driver":                     entry.get("driver_name", ""),
            "Deal Price":                 entry.get("quote_price", ""),
            "Status":                     "Booked",
            "Lead Source":                entry.get("channel", ""),
            "Notes":                      entry.get("description", ""),
            "Number of Days":             entry.get("number_of_days", ""),
            "Booking Amt/Advance Cash":   entry.get("advance_cash", ""),
            "Booking Amt/Advance Bank":   entry.get("advance_bank", ""),
            "Total Cash":                 entry.get("total_cash", ""),
            "Total Bank":                 entry.get("total_bank", ""),
        }
        result = add_trip(trip_data)
        logger.info(f"Auto-created trip #{result.get('trip_id')} from CRM booking for {entry.get('customer_name')}")
    except Exception as e:
        logger.error(f"Auto-create trip failed (non-critical): {e}")


def create_crm_entry(entry: dict) -> dict:
    """
    Append a new CRM row to Google Sheets.
    If status == 'Booked', also auto-creates a matching Trips row.
    """
    entry["timestamp"] = _now_ts()
    row = _entry_to_row(entry)

    ws = _ensure_crm_sheet()
    try:
        ws.append_row(row, value_input_option="USER_ENTERED")
    except Exception as e:
        logger.error(f"CRM append error: {e}")
        raise HTTPException(status_code=500, detail="Failed to write CRM entry to Google Sheets")

    _invalidate_cache()
    logger.info(f"CRM entry created for customer: {entry.get('customer_name')}")

    # Auto-create trip if Booked
    _auto_create_trip_if_booked(entry)

    trip_msg = " Trip entry also created automatically." if entry.get("status") == "Booked" else ""
    return {"msg": f"CRM entry created.{trip_msg}", "timestamp": entry["timestamp"]}


def update_crm_entry(row_number: int, entry: dict) -> dict:
    """
    Overwrite a specific sheet row (1-based, including header row).
    row_number comes from _row key stored in records.
    """
    if row_number < 2:
        raise HTTPException(status_code=400, detail="Invalid row number")

    entry["timestamp"] = _now_ts()
    row = _entry_to_row(entry)

    ws = _ensure_crm_sheet()
    try:
        # Build A1 range for full row replacement
        col_letter = chr(ord("A") + len(CRM_COLUMNS) - 1)  # e.g. "K"
        cell_range = f"A{row_number}:{col_letter}{row_number}"
        ws.update(cell_range, [row], value_input_option="USER_ENTERED")
    except Exception as e:
        logger.error(f"CRM update error (row {row_number}): {e}")
        raise HTTPException(status_code=500, detail="Failed to update CRM entry in Google Sheets")

    _invalidate_cache()
    logger.info(f"CRM entry updated at row {row_number}")

    # Auto-create trip if status changed to Booked
    _auto_create_trip_if_booked(entry)

    trip_msg = " Trip entry also created automatically." if entry.get("status") == "Booked" else ""
    return {"msg": f"CRM entry updated.{trip_msg}", "row": row_number}


# ── Query helpers ──────────────────────────────────────────────────────────────

def query_crm_entries(
    status: Optional[str] = None,
    channel: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    search: Optional[str] = None,
) -> list[dict]:
    """Filter CRM entries by optional criteria."""
    rows = get_all_crm_entries()

    if status:
        rows = [r for r in rows if r.get("status", "").strip() == status]

    if channel:
        rows = [r for r in rows if r.get("channel", "").strip() == channel]

    if start:
        try:
            start_dt = datetime.strptime(start, "%Y-%m-%d").date()
            rows = [
                r for r in rows
                if _parse_date(r.get("timestamp", "")) and _parse_date(r.get("timestamp", "")) >= start_dt
            ]
        except ValueError:
            pass

    if end:
        try:
            end_dt = datetime.strptime(end, "%Y-%m-%d").date()
            rows = [
                r for r in rows
                if _parse_date(r.get("timestamp", "")) and _parse_date(r.get("timestamp", "")) <= end_dt
            ]
        except ValueError:
            pass

    if search:
        q = search.strip().lower()
        rows = [
            r for r in rows
            if q in r.get("customer_name", "").lower()
            or q in r.get("contact", "").lower()
        ]

    return rows


def get_followups_by_date(target_date: Optional[str] = None) -> dict:
    """
    Return follow-up entries grouped by follow_up_date.
    If target_date (YYYY-MM-DD) is given, return only that date's entries.
    Also flags overdue and today's follow-ups.
    """
    rows = get_all_crm_entries()
    today = date.today()

    # Filter to rows that have a follow_up_date
    followup_rows = [r for r in rows if r.get("follow_up_date", "").strip()]

    grouped: dict[str, list] = {}
    for r in followup_rows:
        fd = r["follow_up_date"].strip()
        if target_date and fd != target_date:
            continue
        fd_date = _parse_date(fd)
        r["_is_today"] = (fd_date == today) if fd_date else False
        r["_is_overdue"] = (fd_date < today) if fd_date else False
        grouped.setdefault(fd, []).append(r)

    # Sort groups by date
    sorted_grouped = dict(sorted(grouped.items()))
    return {
        "grouped": sorted_grouped,
        "today": str(today),
    }


def get_customer_history(contact: str = None, customer_name: str = None) -> list[dict]:
    """Return all CRM interactions for a contact or customer_name (full timeline)."""
    rows = get_all_crm_entries()
    result = []
    for r in rows:
        match = False
        if contact and r.get("contact", "").strip() == contact.strip():
            match = True
        elif customer_name and r.get("customer_name", "").strip().lower() == customer_name.strip().lower():
            match = True
        if match:
            result.append(r)
    return sorted(result, key=lambda x: x.get("timestamp", ""))


# ── Analytics helpers ──────────────────────────────────────────────────────────

def get_crm_analytics() -> dict:
    """
    Compute basic CRM analytics:
     - status distribution
     - channel breakdown
     - conversion rate (Enquiry → Booked)
     - follow-up effectiveness
    """
    rows = get_all_crm_entries()
    if not rows:
        return {"total": 0}

    total = len(rows)

    # Status counts
    status_counts: dict[str, int] = {}
    for r in rows:
        s = r.get("status", "Unknown").strip() or "Unknown"
        status_counts[s] = status_counts.get(s, 0) + 1

    # Channel counts
    channel_counts: dict[str, int] = {}
    for r in rows:
        c = r.get("channel", "Unknown").strip() or "Unknown"
        channel_counts[c] = channel_counts.get(c, 0) + 1

    # Conversion: how many Enquiry contacts later became Booked
    enquiry_contacts = {
        r["contact"] for r in rows if r.get("status") == "Enquiry" and r.get("contact")
    }
    booked_contacts = {
        r["contact"] for r in rows if r.get("status") == "Booked" and r.get("contact")
    }
    converted = len(enquiry_contacts & booked_contacts)
    conversion_rate = round((converted / len(enquiry_contacts) * 100), 1) if enquiry_contacts else 0

    # Follow-up count
    followup_count = sum(1 for r in rows if r.get("follow_up_date", "").strip())

    return {
        "total": total,
        "status_counts": status_counts,
        "channel_counts": channel_counts,
        "conversion_rate_pct": conversion_rate,
        "converted_customers": converted,
        "followup_scheduled": followup_count,
    }


# ── Private utilities ──────────────────────────────────────────────────────────

def _parse_date(value: str) -> Optional[date]:
    if not value:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%m/%d/%Y", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    return None
