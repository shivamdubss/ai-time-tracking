#!/usr/bin/env python3
"""Donna backend server — runs as a sidecar process managed by Electron.

Starts the FastAPI/uvicorn server and blocks until terminated.
"""

import argparse
import os
import sys
import secrets
import signal
import logging

from pathlib import Path
from platformdirs import user_data_dir

# ---------------------------------------------------------------------------
# Data directory setup
# ---------------------------------------------------------------------------
DATA_DIR = Path(user_data_dir("Donna", appauthor=False))
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# File-based logging
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

# Default Supabase config — baked in so the desktop app works out of the box.
# Only public/safe keys here. The user's access token (from Supabase auth) is used for sync.
os.environ.setdefault("SUPABASE_URL", "https://lyicrwtrcanotbffjnfk.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "sb_publishable_gOWqe47GJ4pECHVd29j68A_JuZC1VUE")
os.environ.setdefault("SUPABASE_FUNCTION_URL", "https://lyicrwtrcanotbffjnfk.supabase.co/functions/v1/summarize")

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
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Donna backend server")
    parser.add_argument("--port", type=int, default=int(os.environ.get("TIMETRACK_PORT", "8000")))
    args = parser.parse_args()

    port = args.port
    os.environ["TIMETRACK_PORT"] = str(port)

    logger.info("=" * 60)
    logger.info("Donna backend starting")
    logger.info(f"  Python:   {sys.version}")
    logger.info(f"  Platform: {sys.platform}")
    logger.info(f"  Data dir: {DATA_DIR}")
    logger.info(f"  Log file: {LOG_PATH}")
    logger.info(f"  .env:     {'found' if ENV_PATH.exists() else 'NOT FOUND'}")
    logger.info(f"  Port:     {port}")
    logger.info("=" * 60)

    # Graceful shutdown on SIGTERM
    def handle_sigterm(*_):
        logger.info("Received SIGTERM, shutting down")
        sys.exit(0)

    signal.signal(signal.SIGTERM, handle_sigterm)

    try:
        import uvicorn
        # Print ready signal for Electron to detect (also works as health check target)
        logger.info(f"Donna backend running at http://127.0.0.1:{port}")
        uvicorn.run(
            "backend.main:app",
            host="127.0.0.1",
            port=port,
            log_level="warning",
        )
    except Exception:
        logger.exception("Donna backend failed to start")
        sys.exit(1)


if __name__ == "__main__":
    main()
