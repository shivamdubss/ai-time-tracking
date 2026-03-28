import os
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

# Routes that don't require auth
PUBLIC_PATHS = frozenset({"/api/init", "/ws", "/api/auth/sync"})
PUBLIC_PREFIXES = ("/assets/", "/static/")


def get_auth_token() -> str:
    return os.environ.get("TIMETRACK_AUTH_TOKEN", "")


class AuthMiddleware(BaseHTTPMiddleware):
    """Simple bearer token auth for localhost API protection."""

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Skip auth for non-API routes (frontend static files, etc.)
        if not path.startswith("/api"):
            return await call_next(request)

        # Skip auth for public endpoints
        if path in PUBLIC_PATHS or any(path.startswith(p) for p in PUBLIC_PREFIXES):
            return await call_next(request)

        # The /api/init endpoint returns the token to the frontend
        # It only works from localhost (same-machine) as a bootstrap
        if path == "/api/init":
            return await call_next(request)

        token = get_auth_token()
        if not token:
            # No token configured — auth disabled
            return await call_next(request)

        # Check Authorization header
        auth_header = request.headers.get("authorization", "")
        if auth_header == f"Bearer {token}":
            return await call_next(request)

        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
