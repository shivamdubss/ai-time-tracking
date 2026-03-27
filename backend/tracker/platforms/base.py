"""Abstract base classes and stubs for platform-specific functionality."""

import logging
from abc import ABC, abstractmethod
from datetime import datetime
from pathlib import Path
from typing import Callable, Optional

logger = logging.getLogger("timetrack")


class WindowInfoProvider(ABC):
    @abstractmethod
    def get_active_window(self) -> dict:
        """Return {"timestamp": str, "app": str, "title": str}."""
        ...


class ScreenCaptureProvider(ABC):
    @abstractmethod
    def capture_active_window(self, filepath: Path) -> bool:
        """Capture active window to JPEG at filepath. Return True on success."""
        ...


class SleepWakeProvider(ABC):
    @abstractmethod
    def start(self, on_sleep: Callable, on_wake: Callable, stop_event) -> None:
        """Block, listening for sleep/wake events. Respects stop_event for shutdown."""
        ...


# --- Stubs for unsupported platforms ---


class StubWindowInfo(WindowInfoProvider):
    def get_active_window(self) -> dict:
        return {
            "timestamp": datetime.now().isoformat(),
            "app": "Unknown",
            "title": "Platform not supported",
        }


class StubScreenCapture(ScreenCaptureProvider):
    def capture_active_window(self, filepath: Path) -> bool:
        return False


class StubSleepWake(SleepWakeProvider):
    def start(self, on_sleep: Callable, on_wake: Callable, stop_event) -> None:
        logger.warning("SleepWakeProvider: platform not supported")
        stop_event.wait()
