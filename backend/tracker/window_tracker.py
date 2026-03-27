import logging
import os
import time
import json
import threading
from datetime import datetime
from pathlib import Path
from typing import Callable, Optional

logger = logging.getLogger("timetrack")

WINDOW_INTERVAL = float(os.getenv("TIMETRACK_WINDOW_INTERVAL", "3"))
IDLE_THRESHOLD = float(os.getenv("TIMETRACK_IDLE_THRESHOLD", "300"))

try:
    from AppKit import NSWorkspace
    from Quartz import (
        CGWindowListCopyWindowInfo,
        kCGWindowListOptionOnScreenOnly,
        kCGNullWindowID,
        kCGWindowOwnerName,
        kCGWindowName,
        kCGWindowLayer,
    )
    HAS_MACOS = True
except ImportError:
    HAS_MACOS = False


class WindowTracker:
    def __init__(
        self,
        temp_dir: Path,
        interval: float = WINDOW_INTERVAL,
        on_idle: Optional[Callable] = None,
        on_active: Optional[Callable] = None,
    ):
        self.temp_dir = temp_dir
        self.interval = interval
        self.entries: list[dict] = []
        self._stop_event = threading.Event()
        self._paused: bool = False
        self._on_idle = on_idle
        self._on_active = on_active
        self._idle_threshold = IDLE_THRESHOLD
        self._is_idle: bool = False

    def get_active_window(self) -> dict:
        if not HAS_MACOS:
            return {
                "timestamp": datetime.now().isoformat(),
                "app": "Unknown",
                "title": "macOS APIs not available",
            }

        try:
            active_app = NSWorkspace.sharedWorkspace().activeApplication()
            app_name = active_app.get("NSApplicationName", "Unknown")

            # Get window title from CGWindowList
            title = ""
            window_list = CGWindowListCopyWindowInfo(
                kCGWindowListOptionOnScreenOnly, kCGNullWindowID
            )
            for window in window_list:
                if window.get(kCGWindowOwnerName) == app_name and window.get(kCGWindowLayer) == 0:
                    title = window.get(kCGWindowName, "") or ""
                    break

            return {
                "timestamp": datetime.now().isoformat(),
                "app": app_name,
                "title": title,
            }
        except Exception as e:
            return {
                "timestamp": datetime.now().isoformat(),
                "app": "Error",
                "title": str(e),
            }

    def set_paused(self, paused: bool):
        self._paused = paused

    def _check_idle(self, current_entry: dict):
        """Check if user appears idle based on repeated identical window entries."""
        if not self._on_idle or len(self.entries) < 2:
            return

        current_key = (current_entry.get("app"), current_entry.get("title"))

        # Walk backwards to find how long the same window has been active
        run_start_ts = current_entry["timestamp"]
        for entry in reversed(self.entries[:-1]):
            key = (entry.get("app"), entry.get("title"))
            if key != current_key:
                break
            run_start_ts = entry["timestamp"]

        duration = (
            datetime.fromisoformat(current_entry["timestamp"])
            - datetime.fromisoformat(run_start_ts)
        ).total_seconds()

        if duration >= self._idle_threshold and not self._is_idle:
            self._is_idle = True
            logger.info(f"Idle detected: same window for {int(duration)}s")
            self._on_idle("idle")
        elif self._is_idle and len(self.entries) >= 2:
            prev_key = (self.entries[-2].get("app"), self.entries[-2].get("title"))
            if current_key != prev_key:
                self._is_idle = False
                logger.info("Activity resumed: window changed")
                if self._on_active:
                    self._on_active()

    def run(self):
        while not self._stop_event.is_set():
            if not self._paused:
                entry = self.get_active_window()
                self.entries.append(entry)
                self._check_idle(entry)
            self._stop_event.wait(self.interval)

    def stop(self):
        self._stop_event.set()

    def save_log(self) -> Path:
        log_path = self.temp_dir / "window_log.json"
        with open(log_path, "w") as f:
            json.dump(self.entries, f, indent=2)
        return log_path

    def get_entries(self) -> list[dict]:
        return list(self.entries)
