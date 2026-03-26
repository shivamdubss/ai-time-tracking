#!/usr/bin/env python3
"""Development runner: starts backend (uvicorn) and frontend (vite) concurrently."""

import subprocess
import signal
import sys
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
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
signal.signal(signal.SIGTERM, cleanup)


if __name__ == "__main__":
    # Start backend
    backend = subprocess.Popen(
        [
            sys.executable, "-m", "uvicorn",
            "backend.main:app",
            "--host", "127.0.0.1",
            "--port", "8000",
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

    print("\n  TimeTrack is running!")
    print("  Frontend: http://localhost:5173")
    print("  Backend:  http://localhost:8000")
    print("  Press Ctrl+C to stop\n")

    try:
        backend.wait()
    except KeyboardInterrupt:
        cleanup()
