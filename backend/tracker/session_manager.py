import logging
import os
import shutil
import sys
import tempfile
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Optional

from .window_tracker import WindowTracker
from .screenshot import ScreenshotCapture
from .sleep_detector import SleepDetector

logger = logging.getLogger("timetrack")


class SessionManager:
    def __init__(self):
        self.current_session_id: Optional[str] = None
        self.start_time: Optional[datetime] = None
        self.temp_dir: Optional[Path] = None
        self.window_tracker: Optional[WindowTracker] = None
        self.screenshot_capture: Optional[ScreenshotCapture] = None
        self._window_thread: Optional[threading.Thread] = None
        self._screenshot_thread: Optional[threading.Thread] = None
        self._sleep_detector: Optional[SleepDetector] = None
        self._sleep_thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()

        # Accumulator-based elapsed time
        self._accumulated_seconds: float = 0.0
        self._segment_start: Optional[datetime] = None
        self._paused: bool = False
        self._pause_intervals: list[dict] = []

        # Callback for notifying frontend of state changes
        self._on_state_change: Optional[Callable] = None

    @property
    def is_tracking(self) -> bool:
        return self.current_session_id is not None

    @property
    def is_paused(self) -> bool:
        return self._paused

    @property
    def elapsed_seconds(self) -> int:
        with self._lock:
            if self.start_time is None:
                return 0
            total = self._accumulated_seconds
            if self._segment_start is not None:  # not paused
                total += (datetime.now(timezone.utc) - self._segment_start).total_seconds()
            return int(total)

    def set_state_change_callback(self, callback: Callable):
        self._on_state_change = callback

    def pause(self, reason: str = "unknown") -> None:
        with self._lock:
            if not self.is_tracking or self._paused:
                return
            self._paused = True
            now = datetime.now(timezone.utc)
            self._accumulated_seconds += (now - self._segment_start).total_seconds()
            self._segment_start = None
            self._pause_intervals.append({"start": now.isoformat(), "end": None, "reason": reason})
            logger.info(f"Session paused: {reason}")
            if self.window_tracker:
                self.window_tracker.set_paused(True)
            if self.screenshot_capture:
                self.screenshot_capture.set_paused(True)
        # Fire callback outside lock to avoid deadlock
        if self._on_state_change:
            self._on_state_change("paused")

    def resume(self) -> None:
        with self._lock:
            if not self.is_tracking or not self._paused:
                return
            self._paused = False
            self._segment_start = datetime.now(timezone.utc)
            if self._pause_intervals and self._pause_intervals[-1]["end"] is None:
                self._pause_intervals[-1]["end"] = datetime.now(timezone.utc).isoformat()
            logger.info("Session resumed")
            if self.window_tracker:
                self.window_tracker.set_paused(False)
            if self.screenshot_capture:
                self.screenshot_capture.set_paused(False)
        if self._on_state_change:
            self._on_state_change("tracking")

    def start(self) -> str:
        with self._lock:
            if self.is_tracking:
                raise RuntimeError("Already tracking")

            self.current_session_id = str(uuid.uuid4())[:8]
            self.start_time = datetime.now(timezone.utc)

            # Reset accumulator state
            self._accumulated_seconds = 0.0
            self._segment_start = self.start_time
            self._paused = False
            self._pause_intervals = []

            # Create secure temp directory
            self.temp_dir = Path(tempfile.mkdtemp(prefix="timetrack-"))
            if sys.platform != "win32":
                os.chmod(str(self.temp_dir), 0o700)

            # Start trackers
            self.window_tracker = WindowTracker(
                self.temp_dir,
                on_idle=lambda reason: self.pause(reason),
                on_active=lambda: self.resume(),
            )
            self.screenshot_capture = ScreenshotCapture(self.temp_dir)

            self._window_thread = threading.Thread(
                target=self.window_tracker.run, daemon=True
            )
            self._screenshot_thread = threading.Thread(
                target=self.screenshot_capture.run, daemon=True
            )

            # Start sleep/wake detector
            self._sleep_detector = SleepDetector(
                on_sleep=lambda reason: self.pause(reason),
                on_wake=lambda: self.resume(),
            )
            self._sleep_thread = threading.Thread(
                target=self._sleep_detector.run, daemon=True
            )

            self._window_thread.start()
            self._screenshot_thread.start()
            self._sleep_thread.start()

            return self.current_session_id

    def stop(self) -> dict:
        with self._lock:
            if not self.is_tracking:
                raise RuntimeError("Not tracking")

            # Finalize accumulated time if not paused
            if self._segment_start is not None:
                self._accumulated_seconds += (datetime.now(timezone.utc) - self._segment_start).total_seconds()
                self._segment_start = None

            # Close any open pause interval
            if self._pause_intervals and self._pause_intervals[-1]["end"] is None:
                self._pause_intervals[-1]["end"] = datetime.now(timezone.utc).isoformat()

            # Stop trackers
            self.window_tracker.stop()
            self.screenshot_capture.stop()
            if self._sleep_detector:
                self._sleep_detector.stop()

            # Wait for threads
            self._window_thread.join(timeout=5)
            self._screenshot_thread.join(timeout=5)
            if self._sleep_thread:
                self._sleep_thread.join(timeout=5)

            # Save window log
            self.window_tracker.save_log()

            result = {
                "session_id": self.current_session_id,
                "start_time": self.start_time.isoformat(),
                "end_time": datetime.now(timezone.utc).isoformat(),
                "temp_dir": str(self.temp_dir),
                "window_entries": self.window_tracker.get_entries(),
                "screenshots": [str(p) for p in self.screenshot_capture.get_screenshots()],
                "elapsed_seconds": int(self._accumulated_seconds),
                "pause_intervals": list(self._pause_intervals),
            }

            # Reset state (don't clean temp dir yet — summarizer needs it)
            self.current_session_id = None
            self.start_time = None
            self._accumulated_seconds = 0.0
            self._segment_start = None
            self._paused = False
            self._pause_intervals = []

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
