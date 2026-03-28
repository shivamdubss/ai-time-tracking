---
title: Windows download link 404 — asset name mismatch
category: build-errors
date: 2026-03-27
tags: [electron-builder, nsis, landing-page, release, windows]
components: [landing/index.html, electron/package.json]
commits: [306c0c8, 4028e8e, 92269c0]
---

## Problem

The "Download for Windows" button on the landing page returned a 404. The `href` pointed to a filename that didn't match the actual release asset on GitHub.

## Root Cause

electron-builder's NSIS target transforms the `artifactName` template. The config specified:

```json
"artifactName": "DonnaSetup-${version}.${ext}"
```

Expected output: `DonnaSetup-1.0.1.exe`
Actual output: `Donna-Setup-1.0.1.exe`

The NSIS builder inserted a hyphen between the product name ("Donna") and "Setup", ignoring the camelCase in the template. The landing page link was updated multiple times but kept missing the actual name:

1. First attempt used `Donna.Setup.1.0.1.exe` (dots — wrong)
2. Second attempt used `DonnaSetup-1.0.1.exe` (no hyphen after Donna — wrong)
3. Final fix: `Donna-Setup-1.0.1.exe` (matches actual asset)

## Solution

Check the actual release asset name on the GitHub Releases page, then update the landing page `href` to match exactly.

```diff
- href=".../download/DonnaSetup-1.0.1.exe"
+ href=".../download/Donna-Setup-1.0.1.exe"
```

Two locations in `landing/index.html` needed updating — the hero CTA and the bottom CTA.

## Prevention

- **After every release**: click the download button on the live landing page to verify it downloads successfully.
- **When changing `artifactName`**: build locally first (`npm run dist` in `electron/`) and check the actual output filename in the `dist/` folder before updating the landing page link.
- **Don't guess the filename**: electron-builder's NSIS naming has quirks. Always verify the actual output rather than assuming the template expands literally.
