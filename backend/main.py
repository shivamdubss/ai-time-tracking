import json
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path

from .database import init_db, prune_old_sessions
from .tracker.session_manager import SessionManager
from .ws import ws_connections
from .auth import AuthMiddleware, get_auth_token
from .permissions import check_all_permissions
from .routes import sessions, status

logger = logging.getLogger("timetrack")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    prune_old_sessions()
    SessionManager.cleanup_stale()

    if not os.environ.get("ANTHROPIC_API_KEY"):
        logger.warning("ANTHROPIC_API_KEY not set — session summarization will fail")

    yield


app = FastAPI(title="TimeTrack", lifespan=lifespan)

# Auth middleware (before CORS so preflight works)
app.add_middleware(AuthMiddleware)

# CORS for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(sessions.router)
app.include_router(status.router)


@app.get("/api/init")
async def init_endpoint():
    """Bootstrap endpoint — returns auth token to the frontend.
    Only accessible from localhost by design (server binds to 127.0.0.1)."""
    return {"token": get_auth_token()}


@app.get("/api/permissions")
async def permissions_endpoint():
    """Check macOS permission status."""
    return check_all_permissions()


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    # Validate token for WebSocket
    token = ws.query_params.get("token", "")
    expected = get_auth_token()
    if expected and token != expected:
        await ws.close(code=4001, reason="Unauthorized")
        return

    await ws.accept()
    ws_connections.add(ws)
    try:
        while True:
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        ws_connections.discard(ws)
    except Exception:
        ws_connections.discard(ws)


# Serve frontend in production
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(FRONTEND_DIST / "index.html"))
