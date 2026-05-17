"""
services/users.py
─────────────────
User management backed by Google Sheets instead of a SQL database.
Sheet tab name: "Users"
Columns: id, username, password, role, refresh_token

All password hashing still uses bcrypt via passlib (same as before).
"""

import logging
import time
import uuid
from typing import Optional
from fastapi import HTTPException
from config import SHEET_URL

logger = logging.getLogger(__name__)

SHEET_NAME  = "Users"
COLUMNS     = ["id", "username", "password", "role", "refresh_token"]

_cache: dict = {"data": None, "fetched_at": 0.0}
_TTL = 10  # short TTL — auth data must be fresh


def _cache_valid() -> bool:
    return _cache["data"] is not None and (time.monotonic() - _cache["fetched_at"]) < _TTL


def _invalidate():
    _cache["data"] = None
    _cache["fetched_at"] = 0.0


def _ensure_sheet():
    from services.sheets import get_client
    client = get_client()
    try:
        wb = client.open_by_url(f"{SHEET_URL}/edit")
        return wb.worksheet(SHEET_NAME)
    except Exception as e:
        logger.error(f"Cannot open Users sheet: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Cannot open Users sheet. Create a tab named '{SHEET_NAME}' "
                   f"with columns: id, username, password, role, refresh_token"
        )


def _fetch_all() -> list[dict]:
    ws = _ensure_sheet()
    try:
        rows = ws.get_all_values()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read Users sheet: {e}")

    if not rows:
        return []

    header = [h.strip().lower() for h in rows[0]]
    result = []
    for idx, row in enumerate(rows[1:], start=2):
        if not any(str(v).strip() for v in row):
            continue
        d = {"_row": idx}
        for i, col in enumerate(header):
            d[col] = row[i] if i < len(row) else ""
        result.append(d)
    return result


def _get_all_users(use_cache=True) -> list[dict]:
    if use_cache and _cache_valid():
        return _cache["data"]
    rows = _fetch_all()
    _cache["data"] = rows
    _cache["fetched_at"] = time.monotonic()
    return rows


def _write_cell(row_num: int, col_name: str, value: str):
    ws = _ensure_sheet()
    try:
        all_rows = ws.get_all_values()
        if not all_rows:
            raise HTTPException(status_code=500, detail="Users sheet is empty")
        header = [h.strip().lower() for h in all_rows[0]]
        col_idx = header.index(col_name) + 1  # 1-based
        ws.update_cell(row_num, col_idx, value)
        _invalidate()
    except ValueError:
        raise HTTPException(status_code=500, detail=f"Column '{col_name}' not found in Users sheet")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update Users sheet: {e}")


def get_user_by_username(username: str) -> Optional[dict]:
    users = _get_all_users(use_cache=False)
    for u in users:
        if str(u.get("username", "")).strip().lower() == username.strip().lower():
            return u
    return None


def get_user_by_refresh_token(token_hash: str) -> Optional[dict]:
    users = _get_all_users(use_cache=False)
    for u in users:
        if str(u.get("refresh_token", "")).strip() == token_hash:
            return u
    return None


def get_user_by_id(user_id: str) -> Optional[dict]:
    users = _get_all_users(use_cache=False)
    for u in users:
        if str(u.get("id", "")).strip() == str(user_id).strip():
            return u
    return None


def set_refresh_token(row_num: int, token_hash: str):
    _write_cell(row_num, "refresh_token", token_hash)


def clear_refresh_token(row_num: int):
    _write_cell(row_num, "refresh_token", "")


def update_password(row_num: int, hashed_password: str):
    _write_cell(row_num, "password", hashed_password)
    _write_cell(row_num, "refresh_token", "")


def update_role(row_num: int, role: str):
    _write_cell(row_num, "role", role)


def create_user(username: str, hashed_password: str, role: str = "user") -> dict:
    existing = get_user_by_username(username)
    if existing:
        raise HTTPException(status_code=409, detail=f"Username '{username}' already exists")

    ws = _ensure_sheet()
    user_id = str(uuid.uuid4())[:8]
    row = [user_id, username.strip(), hashed_password, role, ""]
    try:
        ws.append_row(row, value_input_option="USER_ENTERED")
        _invalidate()
        logger.info(f"User created in sheet: {username}")
        return {"id": user_id, "username": username, "role": role}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create user: {e}")


def delete_user_row(row_num: int):
    ws = _ensure_sheet()
    try:
        ws.delete_rows(row_num)
        _invalidate()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {e}")


def list_users() -> list[dict]:
    users = _get_all_users(use_cache=False)
    return [{"id": u.get("id",""), "username": u.get("username",""), "role": u.get("role","user")} for u in users]
