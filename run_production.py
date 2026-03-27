#!/usr/bin/env python3
"""Production entry point for the packaged Donna desktop app.

Starts the FastAPI/uvicorn server in-process, opens a pywebview native window,
and shows a system tray icon for background operation.
"""

import os
import sys
import secrets
import threading
import time
import logging

from pathlib import Path
from platformdirs import user_data_dir

# ---------------------------------------------------------------------------
# Data directory setup (must come before logging so we can write the log file)
# ---------------------------------------------------------------------------
DATA_DIR = Path(user_data_dir("Donna", appauthor=False))
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# File-based logging — always writes to DATA_DIR/donna.log so crashes are
# visible even when console=False (Windows packaged build).
# ---------------------------------------------------------------------------
LOG_PATH = DATA_DIR / "donna.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler(LOG_PATH, encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger("donna")

# Point the database to the data directory
os.environ.setdefault("TIMETRACK_DB_DIR", str(DATA_DIR))

# ---------------------------------------------------------------------------
# .env loading from data directory
# ---------------------------------------------------------------------------
ENV_PATH = DATA_DIR / ".env"

def _load_env():
    """Load .env from the data directory (not the install directory)."""
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())

_load_env()

# ---------------------------------------------------------------------------
# Auth token
# ---------------------------------------------------------------------------
def _ensure_auth_token():
    token = os.environ.get("TIMETRACK_AUTH_TOKEN", "").strip()
    if token:
        return token

    token = secrets.token_urlsafe(32)
    os.environ["TIMETRACK_AUTH_TOKEN"] = token

    # Persist to .env
    with open(ENV_PATH, "a") as f:
        f.write(f"\nTIMETRACK_AUTH_TOKEN={token}\n")

    return token

_ensure_auth_token()

# ---------------------------------------------------------------------------
# Server
# ---------------------------------------------------------------------------
PORT = int(os.environ.get("TIMETRACK_PORT", "8000"))
SERVER_URL = f"http://127.0.0.1:{PORT}"

def _start_server():
    """Run uvicorn in-process (blocking)."""
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=PORT,
        log_level="warning",
    )

def _wait_for_server(timeout: float = 15.0):
    """Wait until the server is responding."""
    import urllib.request
    start = time.time()
    while time.time() - start < timeout:
        try:
            urllib.request.urlopen(f"{SERVER_URL}/api/init", timeout=2)
            return True
        except Exception:
            time.sleep(0.3)
    return False

# ---------------------------------------------------------------------------
# System tray
# ---------------------------------------------------------------------------
def _run_tray(shutdown_event: threading.Event):
    """Show a system tray icon with Open / Quit menu."""
    try:
        import pystray
        from PIL import Image
    except ImportError:
        logger.warning("pystray not installed — no tray icon")
        shutdown_event.wait()
        return

    # Create a simple icon (16x16 solid square)
    icon_img = Image.new("RGB", (64, 64), color=(23, 23, 23))

    def on_open(icon, item):
        import webbrowser
        webbrowser.open(SERVER_URL)

    def on_quit(icon, item):
        icon.stop()
        shutdown_event.set()

    menu = pystray.Menu(
        pystray.MenuItem("Open Donna", on_open, default=True),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Quit", on_quit),
    )

    icon = pystray.Icon("Donna", icon_img, "Donna", menu)
    icon.run()

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def _show_error_dialog(message: str):
    """Show a native OS error dialog (no extra dependencies)."""
    try:
        if sys.platform == "win32":
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, message, "Donna Error", 0x10)
        elif sys.platform == "darwin":
            os.system(
                f'osascript -e \'display dialog "{message}" with title "Donna Error" buttons {{"OK"}} default button "OK" with icon stop\''
            )
    except Exception:
        pass  # last resort — if even the dialog fails, the log file is our only hope


def main():
    # Startup diagnostics
    logger.info("=" * 60)
    logger.info("Donna starting up")
    logger.info(f"  Python:   {sys.version}")
    logger.info(f"  Platform: {sys.platform}")
    logger.info(f"  Data dir: {DATA_DIR}")
    logger.info(f"  Log file: {LOG_PATH}")
    logger.info(f"  .env:     {'found' if ENV_PATH.exists() else 'NOT FOUND'}")
    logger.info(f"  Port:     {PORT}")
    logger.info("=" * 60)

    try:
        _main_inner()
    except Exception:
        logger.exception("Donna failed to start")
        _show_error_dialog(f"Donna failed to start.\n\nCheck the log file at:\n{LOG_PATH}")
        sys.exit(1)


def _main_inner():
    shutdown_event = threading.Event()

    # Start uvicorn in background thread
    server_thread = threading.Thread(target=_start_server, daemon=True)
    server_thread.start()

    # Wait for server to be ready
    logger.info("Starting Donna server...")
    if not _wait_for_server():
        logger.error("Server failed to start within 15 seconds")
        _show_error_dialog(f"Donna server failed to start.\n\nCheck the log file at:\n{LOG_PATH}")
        sys.exit(1)

    logger.info(f"Donna running at {SERVER_URL}")

    # Try pywebview for a native window
    try:
        import webview
        logger.info(f"pywebview loaded (version {getattr(webview, '__version__', 'unknown')})")

        def _on_closing():
            # Don't actually close — minimize to tray if available
            return False  # returning False prevents close, user must quit from tray

        # Start tray in background
        tray_thread = threading.Thread(target=_run_tray, args=(shutdown_event,), daemon=True)
        tray_thread.start()

        # pywebview runs on the main thread (required on macOS for WebKit)
        window = webview.create_window(
            "Donna",
            SERVER_URL,
            width=1200,
            height=800,
            min_size=(800, 600),
        )
        webview.start()

        # If webview exits, signal shutdown
        shutdown_event.set()

    except Exception as e:
        # Any pywebview failure (missing module, no WebView2, renderer error)
        # falls back to the default browser gracefully.
        import webbrowser
        logger.warning(f"pywebview failed ({type(e).__name__}: {e}) — opening in browser")
        webbrowser.open(SERVER_URL)

        # Start tray on main thread (blocking)
        _run_tray(shutdown_event)

    logger.info("Donna shutting down")


if __name__ == "__main__":
    main()
