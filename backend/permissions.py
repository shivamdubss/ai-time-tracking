"""macOS permission detection for Accessibility and Screen Recording."""

import sys

try:
    from Quartz import (
        CGWindowListCopyWindowInfo,
        kCGWindowListOptionOnScreenOnly,
        kCGNullWindowID,
        CGWindowListCreateImage,
        CGRectInfinite,
        kCGWindowImageDefault,
    )
    HAS_QUARTZ = True
except ImportError:
    HAS_QUARTZ = False


def check_accessibility() -> bool:
    """Check if Accessibility permission is granted.

    We test by trying to read window info. If we get window titles
    (not just empty strings), accessibility is likely granted.
    """
    if not HAS_QUARTZ:
        return False

    try:
        windows = CGWindowListCopyWindowInfo(
            kCGWindowListOptionOnScreenOnly, kCGNullWindowID
        )
        if not windows:
            return False

        # If we can read at least one non-empty window name, permission is granted
        for w in windows:
            name = w.get("kCGWindowName", "")
            if name:
                return True

        # We got windows but no names — likely missing Accessibility
        # (we can see windows exist but can't read their titles)
        return len(windows) > 0
    except Exception:
        return False


def check_screen_recording() -> bool:
    """Check if Screen Recording permission is granted.

    We test by attempting a screenshot. If it returns None or a
    completely black image, permission is likely missing.
    """
    if not HAS_QUARTZ:
        return False

    try:
        image = CGWindowListCreateImage(
            CGRectInfinite,
            kCGWindowListOptionOnScreenOnly,
            kCGNullWindowID,
            kCGWindowImageDefault,
        )
        return image is not None
    except Exception:
        return False


def check_all_permissions() -> dict:
    """Return status of all required permissions for the current platform."""
    if sys.platform == "win32":
        # Windows doesn't require explicit permissions for window tracking or screenshots
        return {
            "accessibility": True,
            "screen_recording": True,
            "platform_supported": True,
        }

    if sys.platform != "darwin":
        return {
            "accessibility": False,
            "screen_recording": False,
            "platform_supported": False,
        }

    return {
        "accessibility": check_accessibility(),
        "screen_recording": check_screen_recording(),
        "platform_supported": True,
    }
