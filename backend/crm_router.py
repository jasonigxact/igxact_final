"""
crm_router.py
─────────────
FastAPI router for CRM endpoints.
Mount this in main.py with:  app.include_router(crm_router)

All endpoints require a valid JWT (verify_token).
Write endpoints (create / update) require admin role.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse

from schemas.crm import (
    CRMEntryCreate,
    CRMEntryUpdate,
    CRMFollowUpCreate,
    CRMQueryParams,
)
from services.crm import (
    create_crm_entry,
    get_all_crm_entries,
    get_crm_analytics,
    get_customer_history,
    get_followups_by_date,
    query_crm_entries,
    update_crm_entry,
)
from utils import require_admin, verify_token

logger = logging.getLogger(__name__)

crm_router = APIRouter(prefix="/crm", tags=["CRM"])


# ── GET all CRM entries (with optional filters) ────────────────────────────────

@crm_router.get("/entries")
def list_crm_entries(
    status:  str = Query(None),
    channel: str = Query(None),
    start:   str = Query(None),
    end:     str = Query(None),
    search:  str = Query(None),
    user=Depends(verify_token),
):
    """Return all CRM entries, optionally filtered."""
    try:
        params = CRMQueryParams(status=status, channel=channel, start=start, end=end, search=search)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    rows = query_crm_entries(
        status=params.status,
        channel=params.channel,
        start=params.start,
        end=params.end,
        search=params.search,
    )
    return {"entries": rows, "total": len(rows)}


# ── POST create a new CRM entry ────────────────────────────────────────────────

@crm_router.post("/entries", status_code=201)
def create_entry(body: CRMEntryCreate, user=Depends(verify_token)):
    """Append a new CRM entry row to Google Sheets."""
    data = body.dict(by_alias=False)
    result = create_crm_entry(data)
    return result


# ── PUT update an existing CRM entry by row number ────────────────────────────

@crm_router.put("/entries/{row_number}")
def update_entry(row_number: int, body: CRMEntryUpdate, user=Depends(require_admin)):
    """
    Update a CRM entry in-place by its Google Sheet row number.
    row_number is the 1-based sheet row (returned in _row field of GET responses).
    """
    if row_number < 2:
        raise HTTPException(status_code=400, detail="row_number must be ≥ 2 (row 1 is the header)")
    data = body.dict(by_alias=False)
    return update_crm_entry(row_number, data)


# ── GET follow-ups (all or by date) ───────────────────────────────────────────

@crm_router.get("/followups")
def list_followups(
    date: str = Query(None, description="Filter by specific date YYYY-MM-DD"),
    user=Depends(verify_token),
):
    """
    Return follow-up entries grouped by follow_up_date.
    Flags today's and overdue follow-ups.
    """
    return get_followups_by_date(target_date=date)


# ── POST create a follow-up (new row, pre-filled with existing customer) ───────

@crm_router.post("/followups", status_code=201)
def create_followup(body: CRMFollowUpCreate, user=Depends(verify_token)):
    """
    Create a new CRM row representing a follow-up interaction.
    Auto-fills customer_name and contact from the payload.
    Saved as a NEW row so full history is preserved, but tagged
    as 'followup' (not 'new') so analytics count it under the
    same original query rather than as a separate lead.
    """
    data = body.dict()
    data["entry_type"] = "followup"
    return create_crm_entry(data)


# ── GET customer interaction history ──────────────────────────────────────────

@crm_router.get("/history")
def customer_history(
    contact:       str = Query(None),
    customer_name: str = Query(None),
    user=Depends(verify_token),
):
    """
    Return the full timeline of CRM interactions for a customer.
    Identified by contact number or customer_name (contact takes priority).
    """
    if not contact and not customer_name:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one of: contact, customer_name"
        )
    rows = get_customer_history(contact=contact, customer_name=customer_name)
    return {"history": rows, "total": len(rows)}


# ── GET CRM analytics ─────────────────────────────────────────────────────────

@crm_router.get("/analytics")
def crm_analytics(user=Depends(verify_token)):
    """
    Returns:
     - status distribution
     - channel breakdown (Meta Ads vs Google Ads)
     - Enquiry → Booked conversion rate
     - follow-up scheduled count
    """
    return get_crm_analytics()
