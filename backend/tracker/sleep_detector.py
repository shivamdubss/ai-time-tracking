import logging
import threading
from typing import Callable

logger = logging.getLogger("timetrack")

try:
    from AppKit import NSWorkspace
    from Foundation import NSRunLoop, NSDate
    HAS_MACOS = True
except ImportError:
    HAS_MACOS = False


class SleepDetector:
    """Listens for macOS sleep/wake notifications and fires callbacks."""

    def __init__(self, on_sleep: Callable, on_wake: Callable):
        self._on_sleep = on_sleep
        self._on_wake = on_wake
        self._stop_event = threading.Event()

    def run(self):
        """Run on a daemon thread. Spins an NSRunLoop to receive notifications."""
        if not HAS_MACOS:
            logger.warning("SleepDetector: macOS APIs not available")
            self._stop_event.wait()
            return

        ws = NSWorkspace.sharedWorkspace()
        nc = ws.notificationCenter()

        nc.addObserver_selector_name_object_(
            self, "handleSleep:", "NSWorkspaceWillSleepNotification", None
        )
        nc.addObserver_selector_name_object_(
            self, "handleWake:", "NSWorkspaceDidWakeNotification", None
        )

        # Run the NSRunLoop in 1-second increments for clean shutdown
        while not self._stop_event.is_set():
            NSRunLoop.currentRunLoop().runUntilDate_(
                NSDate.dateWithTimeIntervalSinceNow_(1.0)
            )

        nc.removeObserver_(self)

    def handleSleep_(self, notification):
        logger.info("System going to sleep")
        self._on_sleep("sleep")

    def handleWake_(self, notification):
        logger.info("System waking up")
        self._on_wake()

    def stop(self):
        self._stop_event.set()
