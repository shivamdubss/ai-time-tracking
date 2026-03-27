import os
import threading
from datetime import datetime
from pathlib import Path

from .platforms import get_screen_capture_provider

SCREENSHOT_INTERVAL = float(os.getenv("TIMETRACK_SCREENSHOT_INTERVAL", "30"))


class ScreenshotCapture:
    def __init__(self, temp_dir: Path, interval: float = SCREENSHOT_INTERVAL):
        self.temp_dir = temp_dir
        self.interval = interval
        self.screenshots: list[Path] = []
        self._stop_event = threading.Event()
        self._paused: bool = False
        self._provider = get_screen_capture_provider()
        (self.temp_dir / "screenshots").mkdir(parents=True, exist_ok=True)

    def capture(self) -> Path | None:
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filepath = self.temp_dir / "screenshots" / f"capture_{timestamp}.jpg"
            if self._provider.capture_active_window(filepath):
                return filepath
            return None
        except Exception:
            return None

    def set_paused(self, paused: bool):
        self._paused = paused

    def run(self):
        while not self._stop_event.is_set():
            if not self._paused:
                path = self.capture()
                if path:
                    self.screenshots.append(path)
            self._stop_event.wait(self.interval)

    def stop(self):
        self._stop_event.set()

    def get_screenshots(self) -> list[Path]:
        return list(self.screenshots)
