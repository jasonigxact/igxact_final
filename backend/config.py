"""
config.py
─────────
Single source of truth for all app configuration.
Import from here, never hardcode values in other modules.
"""
import os

# ── JWT ───────────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM  = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS   = 7

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is not set")

# ── Google Sheets ──────────────────────────────────────────────────────────────
SHEET_URL = "https://docs.google.com/spreadsheets/d/1cvlrxHIO3WW-u3yhCZ8hVTKBxxyBeVrb7b8OSoa65vo"
SHEET_GID = "1870491225"

GOOGLE_SCOPE = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

# ── CORS ──────────────────────────────────────────────────────────────────────
_raw_origins = os.getenv("ALLOWED_ORIGINS", "https://www.primeholidaypackages.com")
ALLOWED_ORIGINS = [o.strip().rstrip("/") for o in _raw_origins.split(",") if o.strip()]