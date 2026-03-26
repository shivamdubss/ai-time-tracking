import os
import shutil
import tempfile
import threading
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from .window_tracker import WindowTracker
from .screenshot import ScreenshotCapture


class SessionManager:
    def __init__(self):
        self.current_session_id: Optional[str] = None
        self.start_time: Optional[datetime] = None
        self.temp_dir: Optional[Path] = None
        self.window_tracker: Optional[WindowTracker] = None
        self.screenshot_capture: Optional[ScreenshotCapture] = None
        self._window_thread: Optional[threading.Thread] = None
        self._screenshot_thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()

    @property
    def is_tracking(self) -> bool:
        return self.current_session_id is not None

    @property
    def elapsed_seconds(self) -> int:
        if self.start_time is None:
            return 0
        return int((datetime.now() - self.start_time).total_seconds())

    def start(self) -> str:
        with self._lock:
            if self.is_tracking:
                raise RuntimeError("Already tracking")

            self.current_session_id = str(uuid.uuid4())[:8]
            self.start_time = datetime.now()

            # Create secure temp directory
            self.temp_dir = Path(tempfile.mkdtemp(prefix="timetrack-"))
            os.chmod(str(self.temp_dir), 0o700)

            # Start trackers
            self.window_tracker = WindowTracker(self.temp_dir)
            self.screenshot_capture = ScreenshotCapture(self.temp_dir)

            self._window_thread = threading.Thread(
                target=self.window_tracker.run, daemon=True
            )
            self._screenshot_thread = threading.Thread(
                target=self.screenshot_capture.run, daemon=True
            )

            self._window_thread.start()
            self._screenshot_thread.start()

            return self.current_session_id

    def stop(self) -> dict:
        with self._lock:
            if not self.is_tracking:
                raise RuntimeError("Not tracking")

            # Stop trackers
            self.window_tracker.stop()
            self.screenshot_capture.stop()

            # Wait for threads
            self._window_thread.join(timeout=5)
            self._screenshot_thread.join(timeout=5)

            # Save window log
            self.window_tracker.save_log()

            result = {
                "session_id": self.current_session_id,
                "start_time": self.start_time.isoformat(),
                "end_time": datetime.now().isoformat(),
                "temp_dir": str(self.temp_dir),
                "window_entries": self.window_tracker.get_entries(),
                "screenshots": [str(p) for p in self.screenshot_capture.get_screenshots()],
            }

            # Reset state (don't clean temp dir yet — summarizer needs it)
            self.current_session_id = None
            self.start_time = None

            return result

    def cleanup(self, temp_dir: str):
        """Permanently delete all temp data after summarization."""
        try:
            shutil.rmtree(temp_dir)
        except Exception:
            pass

    def cleanup_stale():
        """Remove any leftover temp dirs from crashed sessions."""
        tmp = Path(tempfile.gettempdir())
        for d in tmp.glob("timetrack-*"):
            if d.is_dir():
                try:
                    shutil.rmtree(d)
                except Exception:
                    pass
