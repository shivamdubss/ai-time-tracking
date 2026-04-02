"""OAuth connection, token management, and import endpoints for Google Calendar and M365.

OAuth redirect URIs (must be registered in the developer consoles):
  Google Cloud Console → http://127.0.0.1:8765
  Azure Portal (App Registration) → http://localhost:8766
"""
import logging
import os
import threading
import uuid
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Optional
from urllib.parse import parse_qs, urlparse

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..database import get_all_matters
from ..import_parser import parse_import
from ..integrations_store import (
    delete_google_token,
    delete_m365_token,
    get_google_token,
    get_m365_token,
    save_google_token,
    save_m365_token,
)

logger = logging.getLogger("timetrack")

router = APIRouter(prefix="/api/integrations", tags=["integrations"])

GOOGLE_REDIRECT_PORT = 8765
GOOGLE_REDIRECT_URI = f"http://127.0.0.1:{GOOGLE_REDIRECT_PORT}"
GOOGLE_SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]

M365_REDIRECT_PORT = 8766
M365_REDIRECT_URI = f"http://localhost:{M365_REDIRECT_PORT}"
M365_SCOPES = ["Mail.Read", "User.Read", "offline_access"]
M365_AUTHORITY = "https://login.microsoftonline.com/common"

# In-memory state for pending OAuth flows
_pending_google_flow: dict | None = None
_pending_m365_flow: dict | None = None
_m365_app: object | None = None  # msal.PublicClientApplication singleton


# ─── Status ──────────────────────────────────────────────────────────────────

@router.get("/status")
async def get_status():
    """Return whether Google Calendar and M365 are connected."""
    google = get_google_token()
    m365 = get_m365_token()
    return {
        "google": google is not None,
        "google_email": google.get("email") if google else None,
        "m365": m365 is not None,
        "m365_email": m365.get("email") if m365 else None,
    }


# ─── Google Calendar OAuth ────────────────────────────────────────────────────

@router.post("/google/connect")
async def start_google_connect():
    """Initiate Google Calendar OAuth. Returns {auth_url} to open in browser."""
    global _pending_google_flow

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=501,
            detail="Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )

    try:
        from google_auth_oauthlib.flow import Flow
    except ImportError:
        raise HTTPException(status_code=501, detail="google-auth-oauthlib not installed.")

    client_config = {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }

    flow = Flow.from_client_config(
        client_config,
        scopes=GOOGLE_SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI,
    )
    auth_url, state = flow.authorization_url(
        prompt="consent",
        access_type="offline",
        include_granted_scopes="true",
    )

    _pending_google_flow = {"flow": flow, "state": state}

    # Start callback listener in background thread
    threading.Thread(
        target=_run_google_callback,
        args=(flow,),
        daemon=True,
    ).start()

    return {"auth_url": auth_url}


def _run_google_callback(flow) -> None:
    """Handle the OAuth redirect from Google in a one-shot HTTP server."""
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            code = params.get("code", [None])[0]

            if code:
                try:
                    flow.fetch_token(code=code)
                    creds = flow.credentials

                    # Fetch the user's email from Google
                    email = _fetch_google_email(creds.token)

                    save_google_token({
                        "token": creds.token,
                        "refresh_token": creds.refresh_token,
                        "token_uri": creds.token_uri,
                        "client_id": creds.client_id,
                        "client_secret": creds.client_secret,
                        "scopes": list(creds.scopes) if creds.scopes else [],
                        "email": email,
                    })
                    body = b"<html><body style='font-family:sans-serif;text-align:center;padding:40px'><h2>Google Calendar connected!</h2><p>You can close this tab.</p></body></html>"
                    self.send_response(200)
                except Exception as e:
                    logger.error(f"Google OAuth callback error: {e}")
                    body = b"<html><body><h2>Error connecting. Please try again.</h2></body></html>"
                    self.send_response(500)
            else:
                body = b"<html><body><h2>Connection cancelled.</h2></body></html>"
                self.send_response(400)

            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass  # suppress access logs

    try:
        server = HTTPServer(("127.0.0.1", GOOGLE_REDIRECT_PORT), Handler)
        server.handle_request()  # one-shot: handle a single request then stop
    except Exception as e:
        logger.error(f"Google callback server error: {e}")


def _fetch_google_email(access_token: str) -> str | None:
    try:
        resp = httpx.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=5,
        )
        return resp.json().get("email")
    except Exception:
        return None


@router.delete("/google")
async def disconnect_google():
    """Revoke and remove stored Google tokens."""
    token = get_google_token()
    if token and token.get("token"):
        # Best-effort revoke
        try:
            httpx.post(
                "https://oauth2.googleapis.com/revoke",
                params={"token": token["token"]},
                timeout=5,
            )
        except Exception:
            pass
    delete_google_token()
    return {"disconnected": True}


# ─── Microsoft 365 OAuth ─────────────────────────────────────────────────────

@router.post("/m365/connect")
async def start_m365_connect():
    """Initiate M365 OAuth. Returns {auth_url} to open in browser."""
    global _pending_m365_flow, _m365_app

    client_id = os.getenv("MICROSOFT_CLIENT_ID")
    if not client_id:
        raise HTTPException(
            status_code=501,
            detail="Microsoft OAuth not configured. Set MICROSOFT_CLIENT_ID.",
        )

    try:
        import msal
    except ImportError:
        raise HTTPException(status_code=501, detail="msal not installed.")

    cache = msal.SerializableTokenCache()
    _m365_app = msal.PublicClientApplication(
        client_id,
        authority=M365_AUTHORITY,
        token_cache=cache,
    )

    flow = _m365_app.initiate_auth_code_flow(
        scopes=M365_SCOPES,
        redirect_uri=M365_REDIRECT_URI,
    )
    _pending_m365_flow = {"flow": flow, "cache": cache, "client_id": client_id}

    # Start callback listener in background thread
    threading.Thread(
        target=_run_m365_callback,
        args=(_m365_app, flow, cache, client_id),
        daemon=True,
    ).start()

    return {"auth_url": flow["auth_uri"]}


def _run_m365_callback(msal_app, flow: dict, cache, client_id: str) -> None:
    """Handle the M365 OAuth redirect in a one-shot HTTP server."""
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            parsed = urlparse(self.path)
            params = {k: v[0] for k, v in parse_qs(parsed.query).items()}

            result = msal_app.acquire_token_by_auth_code_flow(flow, params)

            if "access_token" in result:
                email = result.get("id_token_claims", {}).get("preferred_username") or \
                        result.get("id_token_claims", {}).get("email")
                save_m365_token({
                    "cache": cache.serialize(),
                    "client_id": client_id,
                    "email": email,
                    "account_id": result.get("id_token_claims", {}).get("oid"),
                })
                body = b"<html><body style='font-family:sans-serif;text-align:center;padding:40px'><h2>Microsoft 365 connected!</h2><p>You can close this tab.</p></body></html>"
                self.send_response(200)
            else:
                error = result.get("error_description", "Unknown error")
                logger.error(f"M365 OAuth error: {error}")
                body = b"<html><body><h2>Error connecting. Please try again.</h2></body></html>"
                self.send_response(500)

            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    try:
        server = HTTPServer(("localhost", M365_REDIRECT_PORT), Handler)
        server.handle_request()
    except Exception as e:
        logger.error(f"M365 callback server error: {e}")


@router.delete("/m365")
async def disconnect_m365():
    """Remove stored M365 tokens."""
    delete_m365_token()
    return {"disconnected": True}


# ─── Import ───────────────────────────────────────────────────────────────────

class ImportPreviewRequest(BaseModel):
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    sources: list[str] = ["calendar", "email"]  # ["calendar", "email"]


@router.post("/import/preview")
async def import_preview(req: ImportPreviewRequest):
    """Fetch calendar events + emails and parse them into proposed time entries via Claude."""
    calendar_events: list[dict] = []
    emails: list[dict] = []

    if "calendar" in req.sources:
        calendar_events = _fetch_google_events(req.start_date, req.end_date)

    if "email" in req.sources:
        emails = _fetch_m365_emails(req.start_date, req.end_date)

    if not calendar_events and not emails:
        return {"entries": []}

    # Load active matters for Claude context
    db = get_db_for_request()
    matters = get_all_matters(db, status="active") if db else []
    if db:
        db.close()

    entries = parse_import(calendar_events, emails, matters)
    return {"entries": entries}


class ConfirmEntry(BaseModel):
    id: str
    source: str
    date: str
    time: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    duration: int  # minutes
    category: str
    matter_id: Optional[str] = None
    narrative: str


class ImportConfirmRequest(BaseModel):
    entries: list[ConfirmEntry]


@router.post("/import/confirm")
async def import_confirm(req: ImportConfirmRequest):
    """Create activities from approved import entries."""
    from ..database import (
        create_session,
        get_db,
        get_sessions_by_date,
        insert_activity,
        resolve_rate,
        update_session,
    )
    import uuid as _uuid

    created = 0
    errors = []

    conn = get_db()
    try:
        for entry in req.entries:
            try:
                # Parse the date to get YYYY-MM-DD
                date_str = _parse_display_date(entry.date)

                # Find or create a session for this date
                sessions = get_sessions_by_date(conn, date_str)
                if sessions:
                    session_id = sessions[0]["id"]
                else:
                    session_id = str(_uuid.uuid4())
                    create_session(conn, session_id, f"{date_str}T09:00:00")
                    update_session(
                        conn, session_id,
                        end_time=f"{date_str}T17:00:00",
                        status="completed",
                        summary="Imported entries",
                    )

                # Resolve billing
                matter_id = entry.matter_id if entry.matter_id and entry.matter_id.strip() else None
                effective_rate = resolve_rate(conn, matter_id)
                billable = effective_rate is not None

                source_label = "Calendar Import" if entry.source == "calendar" else "Email Import"

                insert_activity(
                    conn,
                    session_id=session_id,
                    app=source_label,
                    context=entry.time,
                    minutes=entry.duration,
                    narrative=entry.narrative,
                    category=entry.category,
                    matter_id=matter_id,
                    billable=billable,
                    effective_rate=effective_rate,
                    start_time=entry.start_time,
                    end_time=entry.end_time,
                )
                created += 1
            except Exception as e:
                logger.error(f"Failed to create activity for entry {entry.id}: {e}")
                errors.append(str(e))
    finally:
        conn.close()

    return {"created": created, "errors": errors}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _fetch_google_events(start_date: str, end_date: str) -> list[dict]:
    """Fetch Google Calendar events for a date range."""
    token_data = get_google_token()
    if not token_data:
        raise HTTPException(status_code=401, detail="Google Calendar not connected.")

    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
    except ImportError:
        raise HTTPException(status_code=501, detail="google-api-python-client not installed.")

    creds = Credentials(
        token=token_data.get("token"),
        refresh_token=token_data.get("refresh_token"),
        token_uri=token_data.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=token_data.get("client_id"),
        client_secret=token_data.get("client_secret"),
        scopes=token_data.get("scopes", GOOGLE_SCOPES),
    )

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        # Persist refreshed token
        updated = dict(token_data)
        updated["token"] = creds.token
        save_google_token(updated)

    service = build("calendar", "v3", credentials=creds, cache_discovery=False)
    result = service.events().list(
        calendarId="primary",
        timeMin=f"{start_date}T00:00:00Z",
        timeMax=f"{end_date}T23:59:59Z",
        singleEvents=True,
        orderBy="startTime",
        maxResults=100,
    ).execute()

    return result.get("items", [])


def _fetch_m365_emails(start_date: str, end_date: str) -> list[dict]:
    """Fetch sent emails from Microsoft 365 for a date range."""
    token_data = get_m365_token()
    if not token_data:
        raise HTTPException(status_code=401, detail="Microsoft 365 not connected.")

    try:
        import msal
    except ImportError:
        raise HTTPException(status_code=501, detail="msal not installed.")

    # Rehydrate MSAL token cache and get a fresh access token
    cache = msal.SerializableTokenCache()
    cache.deserialize(token_data["cache"])

    msal_app = msal.PublicClientApplication(
        token_data["client_id"],
        authority=M365_AUTHORITY,
        token_cache=cache,
    )

    accounts = msal_app.get_accounts()
    if not accounts:
        raise HTTPException(status_code=401, detail="M365 session expired. Please reconnect.")

    result = msal_app.acquire_token_silent(
        scopes=["Mail.Read"],
        account=accounts[0],
    )

    if not result or "access_token" not in result:
        raise HTTPException(status_code=401, detail="M365 token refresh failed. Please reconnect.")

    # Persist updated cache
    updated = dict(token_data)
    updated["cache"] = cache.serialize()
    save_m365_token(updated)

    access_token = result["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    filter_str = (
        f"sentDateTime ge {start_date}T00:00:00Z "
        f"and sentDateTime le {end_date}T23:59:59Z"
    )
    params = {
        "$filter": filter_str,
        "$select": "subject,sentDateTime,bodyPreview,toRecipients,from,conversationId",
        "$top": "100",
        "$orderby": "sentDateTime desc",
    }

    resp = httpx.get(
        "https://graph.microsoft.com/v1.0/me/mailFolders/SentItems/messages",
        headers=headers,
        params=params,
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json().get("value", [])


def get_db_for_request():
    """Get a database connection; return None if unavailable."""
    try:
        from ..database import get_db
        return get_db()
    except Exception:
        return None


def _parse_display_date(display: str) -> str:
    """Convert display date like 'Mon Apr 1' to YYYY-MM-DD using current year."""
    try:
        year = datetime.now().year
        dt = datetime.strptime(f"{display} {year}", "%a %b %d %Y")
        return dt.strftime("%Y-%m-%d")
    except Exception:
        # Fallback: return today
        return datetime.now().strftime("%Y-%m-%d")
