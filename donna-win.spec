# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for Windows DonnaBackend sidecar binary."""

import sys
from pathlib import Path

block_cipher = None
root = Path(SPECPATH)

a = Analysis(
    ['run_production.py'],
    pathex=[str(root)],
    binaries=[],
    datas=[
        (str(root / 'frontend' / 'dist'), 'frontend/dist'),
    ],
    hiddenimports=[
        # uvicorn internals
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.loops.asyncio',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.http.httptools_impl',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.protocols.websockets.websockets_impl',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'uvicorn.lifespan.off',
        # FastAPI / starlette
        'starlette.routing',
        'starlette.responses',
        'starlette.middleware',
        'starlette.middleware.cors',
        # backend modules
        'backend',
        'backend.main',
        'backend.database',
        'backend.auth',
        'backend.permissions',
        'backend.summarizer',
        'backend.sync',
        'backend.ws',
        'backend.models',
        'backend.tracker',
        'backend.tracker.session_manager',
        'backend.tracker.window_tracker',
        'backend.tracker.screenshot',
        'backend.tracker.sleep_detector',
        'backend.tracker.matter_matcher',
        'backend.tracker.platforms',
        'backend.tracker.platforms.win32',
        'backend.routes',
        'backend.routes.sessions',
        'backend.routes.status',
        'backend.routes.clients',
        'backend.routes.matters',
        'backend.routes.activities',
        'backend.routes.analytics',
        # Windows-specific
        'win32gui',
        'win32process',
        'win32con',
        'win32api',
        'pywintypes',
        'pythoncom',
        'psutil',
        'mss',
        # platformdirs
        'platformdirs',
        # anthropic
        'anthropic',
        # PIL (screenshots + image processing)
        'PIL',
        'PIL.Image',
        # dotenv (uvicorn may import)
        'dotenv',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Exclude macOS-only packages
        'AppKit',
        'Quartz',
        'Foundation',
        'objc',
        'pyobjc',
        # Exclude desktop shell packages (Electron handles these now)
        'webview',
        'pystray',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='DonnaBackend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='assets/donna.ico',
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='DonnaBackend',
)
