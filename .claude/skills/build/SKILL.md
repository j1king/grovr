---
name: build
description: Build signed Tauri app with auto-update artifacts
allowed-tools: Bash(./.claude/skills/build/build.sh:*)
---

# Build Skill

Builds a code-signed Tauri application with auto-update support.

## Prerequisites

- Run `/bump` first (creates version bump commit)
- Environment variables configured:
  - `APPLE_SIGNING_IDENTITY` - Developer ID certificate
  - `TAURI_SIGNING_PRIVATE_KEY` - Update signing key
  - (Optional) `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` - For notarization

## Usage

```bash
./build.sh
```

## What it does

1. Verifies last commit is a version bump
2. Checks required environment variables
3. Runs `pnpm tauri build` (with code signing)
4. Verifies code signature
5. Generates `latest.json` for auto-update

## Output artifacts

- `src-tauri/target/release/bundle/macos/Grovr.app` - Signed app
- `src-tauri/target/release/bundle/macos/Grovr.app.tar.gz` - For auto-update
- `src-tauri/target/release/bundle/macos/Grovr.app.tar.gz.sig` - Signature
- `src-tauri/target/release/bundle/dmg/Grovr_X.Y.Z_*.dmg` - Installer
- `src-tauri/target/release/bundle/latest.json` - Update manifest

## Exit codes

- `0`: Success
- `1`: Prerequisites not met
- `2`: Environment variables missing
- `3`: Build failed
- `4`: Signature verification failed
