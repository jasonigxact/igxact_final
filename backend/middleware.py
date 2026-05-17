"""
middleware.py
─────────────
Request logging middleware.

Every request gets a unique request_id (short UUID) that is:
  - Logged on entry with method + path
  - Logged on exit with status code + duration in ms
  - Returned in the X-Request-ID response header

This makes it trivial to trace any request through Render logs.
"""

import logging
import time
import uuid

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("igxact.request")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())[:8]   # 8-char prefix is enough for tracing
        start      = time.perf_counter()

        # Attach to request state so route handlers can reference it
        request.state.request_id = request_id

        logger.info(
            f"[{request_id}] → {request.method} {request.url.path}"
            + (f"?{request.url.query}" if request.url.query else "")
        )

        try:
            response = await call_next(request)
        except Exception as exc:
            duration = int((time.perf_counter() - start) * 1000)
            logger.error(f"[{request_id}] ✗ UNHANDLED {exc!r} ({duration}ms)")
            raise

        duration = int((time.perf_counter() - start) * 1000)
        level    = logging.WARNING if response.status_code >= 400 else logging.INFO
        logger.log(
            level,
            f"[{request_id}] ← {response.status_code} ({duration}ms)"
        )

        response.headers["X-Request-ID"] = request_id
        return response
