"""
schemas/auth.py
───────────────
Pydantic models for auth endpoints.
Moved out of auth.py so the router stays thin.
"""

from pydantic import BaseModel, Field, validator


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1)


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=128)

    @validator("new_password")
    def not_same_as_old(cls, v, values):
        if "old_password" in values and v == values["old_password"]:
            raise ValueError("New password must be different from the current password")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    role: str
    username: str = ""


class MessageResponse(BaseModel):
    msg: str
