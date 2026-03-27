import logging
import threading
from typing import Callable

from .platforms import get_sleep_wake_provider

logger = logging.getLogger("timetrack")


class SleepDetector:
    """Cross-platform sleep/wake detector. Delegates to platform-specific implementation."""

    def __init__(self, on_sleep: Callable, on_wake: Callable):
        self._on_sleep = on_sleep
        self._on_wake = on_wake
        self._stop_event = threading.Event()
        self._provider = get_sleep_wake_provider()

    def run(self):
        """Run on a daemon thread. Blocks until stop() is called."""
        self._provider.start(self._on_sleep, self._on_wake, self._stop_event)

    def stop(self):
        self._stop_event.set()
