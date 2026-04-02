"""Secure token storage for Google Calendar and Microsoft 365 integrations.

Uses macOS Keychain via the keyring library. Falls back to a local JSON file
in the app data directory if keyring is unavailable.
"""
import json
import logging
import os
from pathlib import Path

from platformdirs import user_data_dir

logger = logging.getLogger("timetrack")

_DATA_DIR = Path(user_data_dir("Donna", appauthor=False))
_FALLBACK_FILE = _DATA_DIR / "integration_tokens.json"

SERVICE_GOOGLE = "donna.google_calendar"
SERVICE_M365 = "donna.microsoft_365"
ACCOUNT = "default"

try:
    import keyring
    _KEYRING_AVAILABLE = True
except ImportError:
    _KEYRING_AVAILABLE = False
    logger.warning("keyring not installed — storing integration tokens in local file (less secure)")


def _read_fallback(key: str) -> dict | None:
    if not _FALLBACK_FILE.exists():
        return None
    try:
        data = json.loads(_FALLBACK_FILE.read_text())
        return data.get(key)
    except Exception:
        return None


def _write_fallback(key: str, value: dict) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    data: dict = {}
    if _FALLBACK_FILE.exists():
        try:
            data = json.loads(_FALLBACK_FILE.read_text())
        except Exception:
            pass
    data[key] = value
    _FALLBACK_FILE.write_text(json.dumps(data))


def _delete_fallback(key: str) -> None:
    if not _FALLBACK_FILE.exists():
        return
    try:
        data = json.loads(_FALLBACK_FILE.read_text())
        data.pop(key, None)
        _FALLBACK_FILE.write_text(json.dumps(data))
    except Exception:
        pass


# ─── Google ──────────────────────────────────────────────────────────────────

def save_google_token(token_data: dict) -> None:
    if _KEYRING_AVAILABLE:
        keyring.set_password(SERVICE_GOOGLE, ACCOUNT, json.dumps(token_data))
    else:
        _write_fallback(SERVICE_GOOGLE, token_data)


def get_google_token() -> dict | None:
    if _KEYRING_AVAILABLE:
        raw = keyring.get_password(SERVICE_GOOGLE, ACCOUNT)
        return json.loads(raw) if raw else None
    return _read_fallback(SERVICE_GOOGLE)


def delete_google_token() -> None:
    if _KEYRING_AVAILABLE:
        try:
            keyring.delete_password(SERVICE_GOOGLE, ACCOUNT)
        except Exception:
            pass
    else:
        _delete_fallback(SERVICE_GOOGLE)


# ─── Microsoft 365 ───────────────────────────────────────────────────────────

def save_m365_token(token_data: dict) -> None:
    if _KEYRING_AVAILABLE:
        keyring.set_password(SERVICE_M365, ACCOUNT, json.dumps(token_data))
    else:
        _write_fallback(SERVICE_M365, token_data)


def get_m365_token() -> dict | None:
    if _KEYRING_AVAILABLE:
        raw = keyring.get_password(SERVICE_M365, ACCOUNT)
        return json.loads(raw) if raw else None
    return _read_fallback(SERVICE_M365)


def delete_m365_token() -> None:
    if _KEYRING_AVAILABLE:
        try:
            keyring.delete_password(SERVICE_M365, ACCOUNT)
        except Exception:
            pass
    else:
        _delete_fallback(SERVICE_M365)
