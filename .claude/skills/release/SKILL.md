---
name: release
description: Release to GitHub with tag and artifacts
allowed-tools: Bash(./.claude/skills/release/release.sh:*), Bash(git log*), Write, AskUserQuestion
---

# Release Skill

Publishes a release to GitHub with tag and artifacts.

## Workflow (MUST follow this order)

1. **Check prerequisites**: Run `./release.sh --check` to verify bump and build are done
   - If check fails, STOP and tell user to run `/bump` or `/build` first
   - Extract version from the check output (e.g., "0.7.0")
2. **Generate release notes**: Run `git log v{PREVIOUS_VERSION}..HEAD --oneline` to get commits since last release
3. **Format release notes**: Use the template below
4. **Show and ask approval**: Use AskUserQuestion to show the generated notes and ask for approval
   - Option 1: "Publish with these notes"
   - Option 2: "Edit notes first" (user provides custom notes)
5. **Publish**: Run `./release.sh --publish "notes"` with the approved notes

## Release Notes Template

```markdown
## What's New in v{VERSION}

### ✨ Features
- **Feature Name**: Brief description of the feature

### 🔧 Improvements
- **Improvement Name**: Brief description of the improvement

### 🐛 Bug Fixes
- Fixed description of the bug fix

---

**Full Changelog**: https://github.com/j1king/grovr/compare/v{PREV}...v{VERSION}
```

Notes:
- Only include sections that have content (omit empty sections)
- Use **bold** for feature/improvement names
- Bug fixes don't need bold names, just describe what was fixed

## Script Reference

```bash
./release.sh --check                    # Verify prerequisites
./release.sh --publish "Release notes"  # Publish with inline notes
./release.sh --publish-file notes.md    # Publish with notes from file
```

## Exit codes

- `0`: Success
- `1`: Prerequisites not met (bump not run)
- `2`: Build artifacts missing (build not run)
- `3`: Version mismatch (rebuild required)
- `4`: Git/GitHub operation failed
