import time
import json
import threading
from datetime import datetime
from pathlib import Path

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
    def __init__(self, temp_dir: Path, interval: float = 3.0):
        self.temp_dir = temp_dir
        self.interval = interval
        self.entries: list[dict] = []
        self._stop_event = threading.Event()

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

    def run(self):
        while not self._stop_event.is_set():
            entry = self.get_active_window()
            self.entries.append(entry)
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
