"""
auth.py
───────
Authentication routes — backed by Google Sheets (no SQL database).
"""

import logging

from pydantic import BaseModel
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status

from schemas.auth import ChangePasswordRequest, LoginRequest, MessageResponse, TokenResponse
from config import ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
from utils import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_refresh_token,
    require_admin,
    verify_password,
    verify_token,
)
from services.users import (
    get_user_by_username,
    get_user_by_refresh_token,
    set_refresh_token,
    clear_refresh_token,
    update_password,
    update_role,
    create_user,
    delete_user_row,
    list_users,
    get_user_by_id,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["auth"])


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie("refresh_token", samesite="none", secure=True)


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, response: Response):
    user = get_user_by_username(data.username)
    if not user or not verify_password(data.password, user.get("password", "")):
        logger.warning(f"Failed login: username='{data.username}'")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token  = create_access_token({"sub": user["username"], "role": user.get("role", "user")})
    refresh_tok   = create_refresh_token()
    set_refresh_token(user["_row"], hash_refresh_token(refresh_tok))

    _set_refresh_cookie(response, refresh_tok)
    logger.info(f"Login: username='{user['username']}' role='{user.get('role')}'")
    return TokenResponse(
        access_token=access_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        role=user.get("role", "user"),
        username=user["username"],
    )


# ── Refresh ───────────────────────────────────────────────────────────────────

@router.post("/refresh", response_model=TokenResponse)
def refresh(response: Response, refresh_token: str = Cookie(default=None)):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token provided")

    user = get_user_by_refresh_token(hash_refresh_token(refresh_token))
    if not user:
        logger.warning("Refresh with unknown/revoked token")
        raise HTTPException(status_code=401, detail="Refresh token is invalid or revoked")

    new_refresh = create_refresh_token()
    set_refresh_token(user["_row"], hash_refresh_token(new_refresh))

    _set_refresh_cookie(response, new_refresh)
    new_access = create_access_token({"sub": user["username"], "role": user.get("role", "user")})
    return TokenResponse(
        access_token=new_access,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        role=user.get("role", "user"),
        username=user["username"],
    )


# ── Logout ────────────────────────────────────────────────────────────────────

@router.post("/logout", response_model=MessageResponse)
def logout(response: Response, user: dict = Depends(verify_token)):
    db_user = get_user_by_username(user["sub"])
    if db_user:
        clear_refresh_token(db_user["_row"])
    _clear_refresh_cookie(response)
    logger.info(f"Logout: username='{user['sub']}'")
    return MessageResponse(msg="Logged out successfully")


# ── Change password ───────────────────────────────────────────────────────────

@router.post("/change-password", response_model=MessageResponse)
def change_password(
    data: ChangePasswordRequest,
    response: Response,
    user: dict = Depends(verify_token),
):
    db_user = get_user_by_username(user["sub"])
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(data.old_password, db_user.get("password", "")):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    if verify_password(data.new_password, db_user.get("password", "")):
        raise HTTPException(status_code=400, detail="New password must differ from current")

    update_password(db_user["_row"], hash_password(data.new_password))
    _clear_refresh_cookie(response)
    logger.info(f"Password changed: username='{user['sub']}'")
    return MessageResponse(msg="Password updated. Please log in again.")


# ── Bootstrap admin ───────────────────────────────────────────────────────────

@router.post("/create-user", status_code=status.HTTP_201_CREATED, response_model=MessageResponse)
def bootstrap_admin():
    existing = get_user_by_username("admin")
    if existing:
        raise HTTPException(status_code=409, detail="Admin user already exists")
    create_user("admin", hash_password("1234"), role="admin")
    logger.info("Admin user created in sheet")
    return MessageResponse(msg="Admin user created. Change the default password immediately.")


# ── User Management (admin only) ──────────────────────────────────────────────

class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str = "user"


@router.get("/users", dependencies=[Depends(require_admin)])
def list_all_users():
    return {"users": list_users()}


@router.post("/users", dependencies=[Depends(require_admin)], status_code=201)
def create_new_user(data: CreateUserRequest):
    if not data.username.strip():
        raise HTTPException(status_code=400, detail="Username cannot be empty")
    if len(data.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    if data.role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="Role must be admin or user")
    result = create_user(data.username.strip(), hash_password(data.password), data.role)
    logger.info(f"New user created: username='{result['username']}' role='{result['role']}'")
    return {"msg": "User created successfully", **result}


@router.put("/users/{user_id}/role", dependencies=[Depends(require_admin)])
def update_user_role(user_id: str, data: dict):
    role = data.get("role")
    if role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="Role must be admin or user")
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    update_role(user["_row"], role)
    return {"msg": "Role updated", "username": user["username"], "role": role}


@router.put("/users/{user_id}/password", dependencies=[Depends(require_admin)])
def reset_user_password(user_id: str, data: dict):
    password = data.get("password", "")
    if len(password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    update_password(user["_row"], hash_password(password))
    return {"msg": "Password reset successfully", "username": user["username"]}


@router.delete("/users/{user_id}", dependencies=[Depends(require_admin)])
def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user["username"] == current_user.get("sub"):
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    delete_user_row(user["_row"])
    logger.info(f"User deleted: username='{user['username']}'")
    return {"msg": "User deleted", "username": user["username"]}
