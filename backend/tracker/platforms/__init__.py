"""Platform-specific implementations for window tracking, screenshots, and sleep detection."""

import sys
from .base import WindowInfoProvider, ScreenCaptureProvider, SleepWakeProvider


def get_window_provider() -> WindowInfoProvider:
    if sys.platform == "darwin":
        from .darwin import DarwinWindowInfo
        return DarwinWindowInfo()
    elif sys.platform == "win32":
        from .win32 import Win32WindowInfo
        return Win32WindowInfo()
    from .base import StubWindowInfo
    return StubWindowInfo()


def get_screen_capture_provider() -> ScreenCaptureProvider:
    if sys.platform == "darwin":
        from .darwin import DarwinScreenCapture
        return DarwinScreenCapture()
    elif sys.platform == "win32":
        from .win32 import Win32ScreenCapture
        return Win32ScreenCapture()
    from .base import StubScreenCapture
    return StubScreenCapture()


def get_sleep_wake_provider() -> SleepWakeProvider:
    if sys.platform == "darwin":
        from .darwin import DarwinSleepWake
        return DarwinSleepWake()
    elif sys.platform == "win32":
        from .win32 import Win32SleepWake
        return Win32SleepWake()
    from .base import StubSleepWake
    return StubSleepWake()
