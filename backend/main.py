import json
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path

from .database import init_db, get_db, prune_old_sessions
from .tracker.session_manager import SessionManager
from .ws import ws_connections
from .auth import AuthMiddleware, get_auth_token
from .permissions import check_all_permissions
from .routes import sessions, status, clients, matters, activities, analytics, settings, integrations
from .sync import SyncEngine

logger = logging.getLogger("timetrack")


sync_engine: SyncEngine | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global sync_engine

    # Startup
    init_db()
    prune_old_sessions()
    SessionManager.cleanup_stale()

    if not os.environ.get("ANTHROPIC_API_KEY"):
        logger.warning("ANTHROPIC_API_KEY not set — session summarization will fail")

    # Start sync engine if Supabase is configured
    supabase_url = os.environ.get("SUPABASE_URL", "")
    supabase_anon_key = os.environ.get("SUPABASE_ANON_KEY", "")
    if supabase_url and supabase_anon_key:
        try:
            from supabase import create_client
            sb = create_client(supabase_url, supabase_anon_key)
            sync_engine = SyncEngine(sb, get_db)
            # user_id + access_token set when frontend sends them after auth
            logger.info("SyncEngine initialized (waiting for user auth)")
        except ImportError:
            logger.warning("supabase-py not installed — sync disabled")
        except Exception as e:
            logger.warning(f"SyncEngine init failed: {e}")

    yield

    # Shutdown
    if sync_engine:
        sync_engine.stop()


app = FastAPI(title="Donna", lifespan=lifespan)

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
app.include_router(clients.router)
app.include_router(matters.router)
app.include_router(activities.router)
app.include_router(analytics.router)
app.include_router(settings.router)
app.include_router(integrations.router)


@app.get("/api/init")
async def init_endpoint():
    """Bootstrap endpoint — returns auth token to the frontend.
    Only accessible from localhost by design (server binds to 127.0.0.1)."""
    return {"token": get_auth_token()}


@app.get("/api/permissions")
async def permissions_endpoint():
    """Check platform permission status."""
    return check_all_permissions()


@app.post("/api/auth/sync")
async def auth_sync_endpoint(body: dict = {}):
    """Notify backend of authenticated user to start sync engine."""
    global sync_engine
    user_id = body.get("user_id")
    access_token = body.get("access_token")
    if sync_engine and user_id and access_token:
        sync_engine.set_user(user_id)
        sync_engine.set_access_token(access_token)
        sync_engine.start()
        return {"syncing": True}
    return {"syncing": False}


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
