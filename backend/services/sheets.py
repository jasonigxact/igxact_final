"""
services/sheets.py
─────────────────
Single-responsibility module for all Google Sheets I/O.
All numeric conversion happens here, safe from crashes.
"""

import json
import logging
import os
from typing import Any

import gspread
import numpy as np
import pandas as pd
from fastapi import HTTPException
from google.oauth2.service_account import Credentials

from config import GOOGLE_SCOPE as SCOPE, SHEET_URL, SHEET_GID

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Google Sheets client
# ─────────────────────────────────────────────

def get_client() -> gspread.Client:
    """Authenticate and return an authorised gspread client.
    Tries GOOGLE_CREDS env var first, then falls back to secret file.
    Raises HTTPException(500) on any failure — never returns None.
    """
    creds_dict = None

    # 1. Try environment variable
    creds_env = os.getenv("GOOGLE_CREDS")
    if creds_env:
        try:
            creds_dict = json.loads(creds_env)
        except json.JSONDecodeError as e:
            logger.error(f"GOOGLE_CREDS is not valid JSON: {e}")

    # 2. Fall back to Render secret file
    if creds_dict is None:
        secret_path = "/etc/secrets/google_creds.json"
        if os.path.exists(secret_path):
            try:
                with open(secret_path) as f:
                    creds_dict = json.load(f)
            except Exception as e:
                logger.error(f"Failed to read secret file: {e}")

    if creds_dict is None:
        logger.error("No valid Google credentials found (env var or secret file)")
        raise HTTPException(status_code=500, detail="Google Sheets credentials not configured")

    try:
        creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPE)
        return gspread.authorize(creds)
    except Exception as e:
        logger.error(f"Google Sheets auth error: {e}")
        raise HTTPException(status_code=500, detail="Google Sheets authentication failed")


def open_sheet(tab_gid: str = "0") -> gspread.Worksheet:
    client = get_client()
    try:
        wb = client.open_by_url(f"{SHEET_URL}/edit")
        # Always resolve by gid — never use wb.sheet1 which returns the
        # physically-first tab regardless of its gid.
        return wb.get_worksheet_by_id(int(tab_gid))
    except Exception as e:
        logger.error(f"Failed to open sheet gid={tab_gid}: {e}")
        raise HTTPException(status_code=500, detail="Could not open Google Sheet")


def open_worksheet_by_name(name: str) -> gspread.Worksheet:
    client = get_client()
    try:
        wb = client.open_by_url(f"{SHEET_URL}/edit")
        return wb.worksheet(name)
    except Exception as e:
        logger.error(f"Failed to open worksheet '{name}': {e}")
        raise HTTPException(status_code=500, detail=f"Could not open worksheet '{name}'")


# ─────────────────────────────────────────────
# Safe numeric helpers
# ─────────────────────────────────────────────

def safe_float(value: Any, default: float = 0.0) -> float:
    """
    Convert any value to float without crashing.
    Handles: NaN, Inf, None, '', '₹1,23,456', numpy types, etc.
    """
    if value is None:
        return default
    try:
        if isinstance(value, float):
            if np.isnan(value) or np.isinf(value):
                return default
            return value
        if isinstance(value, (int, np.integer)):
            return float(value)
        cleaned = (
            str(value)
            .strip()
            .replace(",", "")
            .replace("₹", "")
            .replace("%", "")
        )
        if cleaned in ("", "nan", "None", "null", "-", "N/A"):
            return default
        result = float(cleaned)
        if np.isnan(result) or np.isinf(result):
            return default
        return result
    except (ValueError, TypeError):
        return default


def clean_series(series: pd.Series) -> pd.Series:
    """Vectorised numeric cleaning for a DataFrame column."""
    return (
        pd.to_numeric(
            series.astype(str)
            .str.strip()
            .str.replace(",", "", regex=False)
            .str.replace("₹", "", regex=False)
            .str.replace("%", "", regex=False)
            .replace({"": "0", "nan": "0", "None": "0", "null": "0", "N/A": "0", "-": "0"}),
            errors="coerce",
        )
        .replace([np.inf, -np.inf], 0)
        .fillna(0)
    )


def clean_col(df: pd.DataFrame, col: str) -> pd.Series:
    """Clean a single column from a DataFrame; returns zeroes if column missing."""
    if col not in df.columns:
        return pd.Series([0.0] * len(df), index=df.index)
    return clean_series(df[col])


# ─────────────────────────────────────────────
# DataFrame builder
# ─────────────────────────────────────────────

EXPENSE_COLS = [
    "Fuel",
    "Tolls & Taxes",
    "Parking",
    "Driver Allowance",
    "Sales Commission",
    "Other Expenses",
]

REVENUE_COL = "Deal Price"


def normalise_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Strip whitespace and collapse internal whitespace in column names."""
    df.columns = (
        df.columns
        .str.strip()
        .str.replace(r"\s+", " ", regex=True)
    )
    return df


def load_trips_df() -> pd.DataFrame:
    """Fetch all trip records from Google Sheets and return a clean DataFrame."""
    sheet = open_sheet(SHEET_GID)
    try:
        data = sheet.get_all_records()
    except Exception as e:
        logger.error(f"get_all_records failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to read trip data from Google Sheets")

    if not data:
        return pd.DataFrame()

    df = pd.DataFrame(data)
    df = normalise_columns(df)

    # Drop entirely blank rows
    df = df[~df.apply(lambda row: all(str(v).strip() == "" for v in row), axis=1)]

    # Normalise trip id column name to lowercase
    id_col = next((c for c in df.columns if c.strip().lower() == "trip id"), None)
    if id_col and id_col != "trip id":
        df.rename(columns={id_col: "trip id"}, inplace=True)

    if "trip id" in df.columns:
        df["trip id"] = df["trip id"].astype(str).str.strip()

    # Parse dates
    if "Start Date" in df.columns:
        # Try multiple formats — sheet may store as MM/DD/YYYY or ISO or with time
        df["Start Date"] = pd.to_datetime(
            df["Start Date"], errors="coerce"
        )

    if "Cust. Contact Number" in df.columns:
        df["Cust. Contact Number"] = (
            df["Cust. Contact Number"].astype(str).str.replace(" ", "", regex=False)
        )

    # Clean all numeric columns
    all_numeric = EXPENSE_COLS + [
        REVENUE_COL,
        "Net Profit (without Driver Salary)",
        "Profit Percentage",
        "Number of Days",
        "Total Cash",
        "Total Bank",
        "Total",
        "Per Day Cost",
        "Booking Amt/Advance Cash",
        "Booking Amt/Advance Bank",
        "2nd Payment Cash Bank",
        "2nd Payment Bank",
        "Final Payment Mode Cash",
        "Final Payment Mode Bank",
        "Difference",
    ]
    for col in all_numeric:
        df[col] = clean_col(df, col)

    # Derive convenience columns — sum ALL payment columns
    def _pc(col):
        return clean_col(df, col) if col in df.columns else pd.Series(0, index=df.index)

    df["Received"] = (
        _pc("Booking Amt/Advance Cash") +
        _pc("Booking Amt/Advance Bank") +
        _pc("2nd Payment Cash Bank") +
        _pc("2nd Payment Bank") +
        _pc("Final Payment Mode Cash") +
        _pc("Final Payment Mode Bank")
    )
    df["Pending"] = (df[REVENUE_COL] - df["Received"]).clip(lower=0)

    # Normalise Status
    if "Status" not in df.columns:
        df["Status"] = ""
    df["Status"] = (
        df["Status"].astype(str).str.strip().str.lower()
        .str.replace("in progress", "progress", regex=False)
    )

    # ── CORRECT PROFIT CALCULATION ──────────────────────────────────────────
    # Profit = Revenue - (Fuel + Tolls & Taxes + Parking + Driver Allowance
    #                     + Sales Commission + Other Expenses)
    # Profit % = (Profit / Revenue) * 100
    # ────────────────────────────────────────────────────────────────────────
    df["TotalExpense"] = sum(df[col] for col in EXPENSE_COLS if col in df.columns)
    df["CalcProfit"] = df[REVENUE_COL] - df["TotalExpense"]
    df["CalcProfitPct"] = df.apply(
        lambda r: round((r["CalcProfit"] / r[REVENUE_COL]) * 100, 2)
        if r[REVENUE_COL] != 0 else 0.0,
        axis=1,
    )

    # Date-derived helpers
    if "Start Date" in df.columns:
        df["Month"] = df["Start Date"].dt.to_period("M").astype(str)
        df["MonthName"] = df["Start Date"].dt.strftime("%B")
        df["MonthNum"] = df["Start Date"].dt.month
        df["DayOfWeek"] = df["Start Date"].dt.day_name()
        df["Year"] = df["Start Date"].dt.year

    if "Trip From" in df.columns and "Trip TO" in df.columns:
        df["Route"] = (
            df["Trip From"].astype(str).str.strip()
            + " → "
            + df["Trip TO"].astype(str).str.strip()
        )

    return df
