"""Windows platform implementations using pywin32, mss, and psutil."""

import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Callable

from .base import WindowInfoProvider, ScreenCaptureProvider, SleepWakeProvider

logger = logging.getLogger("timetrack")

# Window tracking
try:
    import win32gui
    import win32process
    import psutil
    HAS_WIN32 = True
except ImportError:
    HAS_WIN32 = False

# Screenshot capture
try:
    import mss
    from PIL import Image
    HAS_MSS = True
except ImportError:
    HAS_MSS = False


class Win32WindowInfo(WindowInfoProvider):
    def get_active_window(self) -> dict:
        if not HAS_WIN32:
            return {
                "timestamp": datetime.now().isoformat(),
                "app": "Unknown",
                "title": "Windows APIs not available",
            }

        try:
            hwnd = win32gui.GetForegroundWindow()
            title = win32gui.GetWindowText(hwnd)

            # Get process name from window handle
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            try:
                process = psutil.Process(pid)
                app_name = process.name()
                # Strip .exe suffix for cleaner display
                if app_name.lower().endswith(".exe"):
                    app_name = app_name[:-4]
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                app_name = "Unknown"

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


class Win32ScreenCapture(ScreenCaptureProvider):
    def capture_active_window(self, filepath: Path) -> bool:
        if not HAS_WIN32 or not HAS_MSS:
            return False

        try:
            hwnd = win32gui.GetForegroundWindow()
            rect = win32gui.GetWindowRect(hwnd)
            left, top, right, bottom = rect

            # Ensure valid dimensions
            width = right - left
            height = bottom - top
            if width <= 0 or height <= 0:
                return False

            with mss.mss() as sct:
                monitor = {
                    "left": left,
                    "top": top,
                    "width": width,
                    "height": height,
                }
                screenshot = sct.grab(monitor)
                img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")
                img.save(str(filepath), "JPEG", quality=60)

            return True
        except Exception:
            return False


class Win32SleepWake(SleepWakeProvider):
    """Listens for Windows power broadcast messages (sleep/wake) via a hidden window."""

    WM_POWERBROADCAST = 0x0218
    PBT_APMSUSPEND = 0x0004
    PBT_APMRESUMESUSPEND = 0x0007

    def start(self, on_sleep: Callable, on_wake: Callable, stop_event) -> None:
        if not HAS_WIN32:
            logger.warning("Win32SleepWake: pywin32 not available")
            stop_event.wait()
            return

        import win32con
        import win32api

        def wnd_proc(hwnd, msg, wparam, lparam):
            if msg == self.WM_POWERBROADCAST:
                if wparam == self.PBT_APMSUSPEND:
                    logger.info("System going to sleep")
                    on_sleep("sleep")
                elif wparam == self.PBT_APMRESUMESUSPEND:
                    logger.info("System waking up")
                    on_wake()
            return win32gui.DefWindowProc(hwnd, msg, wparam, lparam)

        # Register a window class
        wc = win32gui.WNDCLASS()
        wc.lpfnWndProc = wnd_proc
        wc.lpszClassName = "DonnaSleepDetector"
        wc.hInstance = win32api.GetModuleHandle(None)

        try:
            class_atom = win32gui.RegisterClass(wc)
        except Exception:
            # Class may already be registered from a previous session
            class_atom = None

        # Create hidden message-only window
        hwnd = win32gui.CreateWindow(
            wc.lpszClassName, "Donna Sleep Detector",
            0, 0, 0, 0, 0,
            win32con.HWND_MESSAGE, 0, wc.hInstance, None
        )

        # Pump messages until stop_event is set
        try:
            while not stop_event.is_set():
                # PeekMessage with a short timeout to check stop_event periodically
                if win32gui.PeekMessage(hwnd, 0, 0, win32con.PM_REMOVE):
                    msg = win32gui.GetMessage(hwnd, 0, 0)
                    if msg:
                        win32gui.TranslateMessage(msg)
                        win32gui.DispatchMessage(msg)
                else:
                    stop_event.wait(1.0)
        finally:
            win32gui.DestroyWindow(hwnd)
            if class_atom:
                try:
                    win32gui.UnregisterClass(wc.lpszClassName, wc.hInstance)
                except Exception:
                    pass
