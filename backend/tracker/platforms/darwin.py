"""macOS platform implementations using PyObjC (AppKit, Quartz)."""

import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Callable

from .base import WindowInfoProvider, ScreenCaptureProvider, SleepWakeProvider

logger = logging.getLogger("timetrack")

try:
    from AppKit import NSWorkspace, NSBitmapImageRep, NSJPEGFileType
    from Quartz import (
        CGWindowListCopyWindowInfo,
        CGWindowListCreateImage,
        CGWindowListCreateImageFromArray,
        CGRectNull,
        CGRectInfinite,
        kCGWindowListOptionOnScreenOnly,
        kCGNullWindowID,
        kCGWindowOwnerName,
        kCGWindowName,
        kCGWindowNumber,
        kCGWindowLayer,
        kCGWindowImageDefault,
    )
    from Foundation import NSArray, NSRunLoop, NSDate
    HAS_MACOS = True
except ImportError:
    HAS_MACOS = False


class DarwinWindowInfo(WindowInfoProvider):
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


class DarwinScreenCapture(ScreenCaptureProvider):
    def capture_active_window(self, filepath: Path) -> bool:
        if not HAS_MACOS:
            return False

        try:
            active_app = NSWorkspace.sharedWorkspace().activeApplication()
            app_name = active_app.get("NSApplicationName", "Unknown")

            window_list = CGWindowListCopyWindowInfo(
                kCGWindowListOptionOnScreenOnly, kCGNullWindowID
            )

            window_id = None
            for window in window_list:
                if window.get(kCGWindowOwnerName) == app_name and window.get(kCGWindowLayer) == 0:
                    window_id = window.get(kCGWindowNumber)
                    break

            if window_id is None:
                image = CGWindowListCreateImage(
                    CGRectInfinite,
                    kCGWindowListOptionOnScreenOnly,
                    kCGNullWindowID,
                    kCGWindowImageDefault,
                )
            else:
                image = CGWindowListCreateImageFromArray(
                    CGRectNull,
                    NSArray.arrayWithObject_(window_id),
                    kCGWindowImageDefault,
                )

            if image is None:
                return False

            bitmap = NSBitmapImageRep.alloc().initWithCGImage_(image)
            jpeg_data = bitmap.representationUsingType_properties_(
                NSJPEGFileType, {NSBitmapImageRep.NSImageCompressionFactor: 0.6}
            )

            jpeg_data.writeToFile_atomically_(str(filepath), True)

            if sys.platform != "win32":
                filepath.chmod(0o600)

            return True
        except Exception:
            return False


class DarwinSleepWake(SleepWakeProvider):
    def __init__(self):
        self._on_sleep = None
        self._on_wake = None

    def start(self, on_sleep: Callable, on_wake: Callable, stop_event) -> None:
        if not HAS_MACOS:
            logger.warning("DarwinSleepWake: macOS APIs not available")
            stop_event.wait()
            return

        self._on_sleep = on_sleep
        self._on_wake = on_wake

        ws = NSWorkspace.sharedWorkspace()
        nc = ws.notificationCenter()

        nc.addObserver_selector_name_object_(
            self, "handleSleep:", "NSWorkspaceWillSleepNotification", None
        )
        nc.addObserver_selector_name_object_(
            self, "handleWake:", "NSWorkspaceDidWakeNotification", None
        )

        while not stop_event.is_set():
            NSRunLoop.currentRunLoop().runUntilDate_(
                NSDate.dateWithTimeIntervalSinceNow_(1.0)
            )

        nc.removeObserver_(self)

    def handleSleep_(self, notification):
        logger.info("System going to sleep")
        if self._on_sleep:
            self._on_sleep("sleep")

    def handleWake_(self, notification):
        logger.info("System waking up")
        if self._on_wake:
            self._on_wake()
