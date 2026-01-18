---
name: release
description: Release to GitHub with tag and artifacts
allowed-tools: Bash(./.claude/skills/release/release.sh:*), Write, AskUserQuestion
---

# Release Skill

Publishes a release to GitHub with tag and artifacts.

## Prerequisites

- Run `/bump` first (creates version bump commit)
- Run `/build` first (creates signed artifacts)

## Usage

```bash
# Verify prerequisites only
./release.sh --check

# Publish release with notes
./release.sh --publish "Release notes here"

# Publish release with notes from file
./release.sh --publish-file /path/to/notes.md
```

## What it does

### `--check` mode
1. Verifies last commit is version bump
2. Verifies build artifacts exist
3. Verifies versions match
4. Reports readiness status

### `--publish` mode
1. Runs all checks
2. Creates and pushes git tag
3. Creates GitHub release with artifacts
4. Uploads: DMG, tar.gz, latest.json

## Exit codes

- `0`: Success
- `1`: Prerequisites not met (bump not run)
- `2`: Build artifacts missing (build not run)
- `3`: Version mismatch (rebuild required)
- `4`: Git/GitHub operation failed
