---
name: bump
description: Bump version in all config files and commit
argument-hint: <version> (e.g., 0.6.0)
allowed-tools: Bash(./.claude/skills/bump/bump.sh:*)
---

# Version Bump Skill

Updates version numbers across package.json, tauri.conf.json, and Cargo.toml, then creates a commit.

## Usage

```bash
./bump.sh <version>
# Example: ./bump.sh 0.6.0
```

## What it does

1. Validates semantic version format (X.Y.Z)
2. Checks git status is clean
3. Updates version in:
   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`
4. Creates commit: `chore: bump version to X.Y.Z`

## Exit codes

- `0`: Success
- `1`: Invalid arguments or validation failed
- `2`: Git status not clean
- `3`: Version update failed
