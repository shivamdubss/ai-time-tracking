import threading
import time
from datetime import datetime
from pathlib import Path

try:
    from Quartz import (
        CGWindowListCreateImage,
        CGRectNull,
        kCGWindowListOptionOnScreenOnly,
        kCGNullWindowID,
        CGWindowListCopyWindowInfo,
        kCGWindowOwnerName,
        kCGWindowNumber,
        kCGWindowLayer,
        CGWindowListCreateImageFromArray,
        CGRectInfinite,
        kCGWindowImageDefault,
    )
    from AppKit import NSWorkspace, NSBitmapImageRep, NSJPEGFileType
    from Foundation import NSArray
    HAS_MACOS = True
except ImportError:
    HAS_MACOS = False


class ScreenshotCapture:
    def __init__(self, temp_dir: Path, interval: float = 30.0):
        self.temp_dir = temp_dir
        self.interval = interval
        self.screenshots: list[Path] = []
        self._stop_event = threading.Event()
        (self.temp_dir / "screenshots").mkdir(parents=True, exist_ok=True)

    def capture(self) -> Path | None:
        if not HAS_MACOS:
            return None

        try:
            # Get the frontmost app's window ID
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
                # Fall back to full screen capture
                image = CGWindowListCreateImage(
                    CGRectInfinite,
                    kCGWindowListOptionOnScreenOnly,
                    kCGNullWindowID,
                    kCGWindowImageDefault,
                )
            else:
                # Capture specific window
                image = CGWindowListCreateImageFromArray(
                    CGRectNull,
                    NSArray.arrayWithObject_(window_id),
                    kCGWindowImageDefault,
                )

            if image is None:
                return None

            # Convert to JPEG
            bitmap = NSBitmapImageRep.alloc().initWithCGImage_(image)
            jpeg_data = bitmap.representationUsingType_properties_(
                NSJPEGFileType, {NSBitmapImageRep.NSImageCompressionFactor: 0.6}
            )

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filepath = self.temp_dir / "screenshots" / f"capture_{timestamp}.jpg"
            jpeg_data.writeToFile_atomically_(str(filepath), True)

            # Set restrictive permissions
            filepath.chmod(0o600)

            return filepath
        except Exception:
            return None

    def run(self):
        while not self._stop_event.is_set():
            path = self.capture()
            if path:
                self.screenshots.append(path)
            self._stop_event.wait(self.interval)

    def stop(self):
        self._stop_event.set()

    def get_screenshots(self) -> list[Path]:
        return list(self.screenshots)
