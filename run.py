#!/usr/bin/env python3
"""Development runner: starts backend (uvicorn) and frontend (vite) concurrently."""

import subprocess
import signal
import sys
import os
import secrets

ROOT = os.path.dirname(os.path.abspath(__file__))

# Load .env before anything else
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(ROOT, ".env"))
except ImportError:
    pass  # dotenv not installed — env vars must be set manually
FRONTEND_DIR = os.path.join(ROOT, "frontend")

processes = []


def cleanup(sig=None, frame=None):
    for p in processes:
        try:
            p.terminate()
        except Exception:
            pass
    sys.exit(0)


signal.signal(signal.SIGINT, cleanup)
if hasattr(signal, "SIGTERM"):
    signal.signal(signal.SIGTERM, cleanup)


def ensure_auth_token():
    """Auto-generate auth token on first run if not set."""
    token = os.environ.get("TIMETRACK_AUTH_TOKEN", "").strip()
    if token:
        return token

    token = secrets.token_urlsafe(32)
    env_path = os.path.join(ROOT, ".env")

    # Append to .env (create if missing)
    with open(env_path, "a") as f:
        f.write(f"\nTIMETRACK_AUTH_TOKEN={token}\n")

    os.environ["TIMETRACK_AUTH_TOKEN"] = token
    return token


if __name__ == "__main__":
    # Validate required config
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("\n  WARNING: ANTHROPIC_API_KEY is not set.")
        print("  Session summarization will fail.")
        print("  Set it in .env or export it in your shell.\n")

    token = ensure_auth_token()
    port = os.environ.get("TIMETRACK_PORT", "8000")

    # Start backend
    backend = subprocess.Popen(
        [
            sys.executable, "-m", "uvicorn",
            "backend.main:app",
            "--host", "127.0.0.1",
            "--port", port,
            "--reload",
        ],
        cwd=ROOT,
    )
    processes.append(backend)

    # Start frontend
    frontend = subprocess.Popen(
        ["npx", "vite", "--port", "5173"],
        cwd=FRONTEND_DIR,
    )
    processes.append(frontend)

    print("\n  Donna is running!")
    print(f"  Frontend: http://localhost:5173")
    print(f"  Backend:  http://localhost:{port}")
    print(f"  Auth:     {token[:8]}...")
    print("  Press Ctrl+C to stop\n")

    try:
        backend.wait()
    except KeyboardInterrupt:
        cleanup()
