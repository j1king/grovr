---
description: Release to GitHub - bump version, build, create release notes, and publish with artifacts
argument-hint: <version> (e.g., 0.1.1)
allowed-tools: Read, Edit, Bash(pnpm:*), Bash(cargo:*), Bash(git:*), Bash(gh:*), Bash(hdiutil:*), Bash(rustup:*), Grep, Glob, TodoWrite, AskUserQuestion
---

# GitHub Release Command

Release a new version of Grovr Desktop to GitHub with downloadable artifacts.

## Arguments

- `$ARGUMENTS`: Target version (e.g., `0.1.1`)

## Current State

- **Current branch**: !`git branch --show-current`
- **Git status**: !`git status --short`
- **Current package.json version**: !`grep '"version"' package.json | head -1`
- **Current tauri.conf.json version**: !`grep '"version"' src-tauri/tauri.conf.json | head -1`
- **Current Cargo.toml version**: !`grep '^version' src-tauri/Cargo.toml | head -1`
- **Latest git tag**: !`git describe --tags --abbrev=0 2>/dev/null || echo "No tags found"`
- **Recent commits since last tag**: !`git log $(git describe --tags --abbrev=0 2>/dev/null || echo HEAD~10)..HEAD --oneline 2>/dev/null || git log -10 --oneline`
- **Installed Rust targets**: !`rustup target list --installed`

## Release Workflow

Execute the following steps in order. Stop and ask for confirmation at each checkpoint.

### Step 1: Validate Input

- If `$ARGUMENTS` is empty or invalid, ask the user for a valid semantic version (e.g., `0.1.1`)
- Validate the version format matches `X.Y.Z` pattern
- Ensure the new version is greater than the current version

### Step 2: Update Version Files

Update the version in all three files:
1. `package.json` - update `"version": "X.Y.Z"`
2. `src-tauri/tauri.conf.json` - update `"version": "X.Y.Z"`
3. `src-tauri/Cargo.toml` - update `version = "X.Y.Z"`

### Step 3: Build Tauri App Bundle

Build the full Tauri application bundle:
```bash
pnpm install
pnpm tauri build
```

This creates:
- `src-tauri/target/release/bundle/macos/Grovr.app` - macOS application
- The build includes frontend (TypeScript/Vite) and backend (Rust)

If build fails, stop and report the error. Do NOT proceed to commit.

### Step 4: Create DMG Artifacts

Create DMG installer for distribution:

```bash
# Create output directory
mkdir -p src-tauri/target/release/bundle/dmg

# Create DMG for current architecture (ARM or Intel)
hdiutil create -volname "Grovr" \
  -srcfolder src-tauri/target/release/bundle/macos/Grovr.app \
  -ov -format UDZO \
  src-tauri/target/release/bundle/dmg/Grovr_X.Y.Z_aarch64.dmg
```

**Architecture naming convention:**
- `aarch64` - Apple Silicon (M1/M2/M3)
- `x86_64` - Intel Mac

### Step 5: Create Version Bump Commit

Stage and commit the version changes:
```bash
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "chore: bump version to X.Y.Z"
```

### Step 6: Generate Changelog

Compare changes since the last release tag:
- Analyze git diff between the last tag and HEAD
- Group changes by type (feat, fix, chore, docs, refactor, etc.)
- Summarize the key changes in a user-friendly format

### Step 7: Draft Release Notes

Create a release notes draft. Example:

```markdown
## What's New in vX.Y.Z

### ✨ Features

#### UI/UX
- **Dark Mode**: System-aware theme switching with manual override option
- **Drag-and-Drop**: Reorganize items by dragging them into preferred order

#### Integrations
- **GitHub Sync**: Two-way sync with GitHub issues and pull requests
- **Slack Notifications**: Get notified when tasks are completed

### 🔧 Improvements
- Reduced app startup time by 40%
- Better error messages for network failures

### 🐛 Bug Fixes
- Fixed memory leak when switching between projects
- Fixed incorrect timestamps in activity log

### ⚠️ Breaking Changes
- Removed deprecated `legacyMode` config option
- Minimum macOS version is now 12.0 (was 10.15)

---

## Downloads

| Platform | Architecture | Download |
|----------|--------------|----------|
| macOS | Apple Silicon (M1/M2/M3) | `Grovr_X.Y.Z_aarch64.dmg` |

**Full Changelog**: https://github.com/OWNER/REPO/compare/vPREV...vX.Y.Z
```

**Guidelines:**
- Use emoji headers: ✨ Features, 🔧 Improvements, 🐛 Bug Fixes, ⚠️ Breaking Changes
- **Bold** the feature/fix name, then describe what it does
- When features are many, group by category (UI/UX, Integrations, Performance, etc.)
- Only include sections that have content
- Keep descriptions concise but informative

### Step 8: User Confirmation

**CHECKPOINT**: Present the release notes draft to the user and ask for confirmation:
- Show the complete release notes
- List the artifacts that will be uploaded
- Ask if they want to proceed with the release
- Allow them to request modifications to the notes

### Step 9: Publish Release with Artifacts

Only after user confirmation:

1. Create and push the git tag:
```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin main
git push origin vX.Y.Z
```

2. Create GitHub release with artifacts:
```bash
gh release create vX.Y.Z \
  --title "vX.Y.Z" \
  --notes "RELEASE_NOTES_HERE" \
  src-tauri/target/release/bundle/dmg/Grovr_X.Y.Z_aarch64.dmg
```

3. Verify the upload:
```bash
gh release view vX.Y.Z --json assets -q '.assets[].name'
```

4. Report success with the release URL

## Error Handling

- If any step fails, stop immediately and report the error
- Do NOT proceed to the next step if the current step failed
- Provide clear instructions on how to fix the issue
- If user cancels at checkpoint, offer to revert the version bump commit
- If DMG creation fails, check for mounted volumes: `hdiutil detach /Volumes/Grovr*`

## Best Practices

### Semantic Versioning
- **MAJOR** (X.0.0): Breaking changes, incompatible API changes
- **MINOR** (0.X.0): New features, backwards compatible
- **PATCH** (0.0.X): Bug fixes, backwards compatible

### Release Checklist
- [ ] All tests pass
- [ ] No uncommitted changes
- [ ] On `main` branch
- [ ] Version is greater than current
- [ ] Changelog accurately reflects changes

## Notes

- Ensure you're on the `main` branch before releasing
- All changes should be committed before starting the release
- The build must pass before creating any commits or tags
- DMG files are gitignored (*.dmg in .gitignore)
- Artifacts are stored in `src-tauri/target/release/bundle/`
