---
name: bump
description: Bump version in all config files and commit
argument-hint: <version> (e.g., 0.6.0)
allowed-tools: Bash(./.claude/skills/bump/bump.sh:*)
---

# Version Bump Skill

Updates version, builds signed app, updates Homebrew cask, and creates a single commit.

## Prerequisites

- Git status must be clean
- Environment variables configured:
  - `APPLE_SIGNING_IDENTITY` - Developer ID certificate
  - `TAURI_SIGNING_PRIVATE_KEY` - Update signing key
  - (Optional) `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` - For notarization

## Usage

```bash
./bump.sh <version>
# Example: ./bump.sh 0.8.0
```

## What it does

1. Validates semantic version format (X.Y.Z)
2. Checks git status is clean
3. Updates version in:
   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`
   - `grovr.cask.rb` (version)
4. Builds signed Tauri app
5. Verifies code signature
6. Generates `latest.json` for auto-update
7. Updates `grovr.cask.rb` with SHA-256
8. Creates commit: `chore: bump version to X.Y.Z`

## Exit codes

- `0`: Success
- `1`: Invalid arguments or validation failed
- `2`: Environment variables missing or git status not clean
- `4`: Signature verification failed
