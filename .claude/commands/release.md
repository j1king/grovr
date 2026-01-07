---
description: Release to GitHub - bump version, build, create release notes, and publish
argument-hint: <version> (e.g., 0.1.1)
allowed-tools: Read, Edit, Bash(pnpm:*), Bash(cargo:*), Bash(git:*), Bash(gh:*), Grep, Glob, TodoWrite, AskUserQuestion
---

# GitHub Release Command

Release a new version of Grovr Desktop to GitHub.

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

### Step 3: Build Verification

Run the build to verify everything works:
```bash
pnpm install
pnpm build
cargo build --manifest-path src-tauri/Cargo.toml --release
```

If build fails, stop and report the error. Do NOT proceed to commit.

### Step 4: Create Version Bump Commit

Stage and commit the version changes:
```bash
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "chore: bump version to X.Y.Z"
```

### Step 5: Generate Changelog

Compare changes since the last release tag:
- Analyze git diff between the last tag and HEAD
- Group changes by type (feat, fix, chore, docs, refactor, etc.)
- Summarize the key changes in a user-friendly format

### Step 6: Draft Release Notes

Create a release notes draft in this format:

```markdown
## What's New in vX.Y.Z

### Features
- Feature descriptions...

### Bug Fixes
- Fix descriptions...

### Improvements
- Improvement descriptions...

### Breaking Changes (if any)
- Breaking change descriptions...

---
**Full Changelog**: https://github.com/OWNER/REPO/compare/vPREV...vX.Y.Z
```

### Step 7: User Confirmation

**CHECKPOINT**: Present the release notes draft to the user and ask for confirmation:
- Show the complete release notes
- Ask if they want to proceed with the release
- Allow them to request modifications to the notes

### Step 8: Publish Release

Only after user confirmation:

1. Create and push the git tag:
```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin main
git push origin vX.Y.Z
```

2. Create GitHub release:
```bash
gh release create vX.Y.Z --title "vX.Y.Z" --notes "RELEASE_NOTES_HERE"
```

3. Report success with the release URL

## Error Handling

- If any step fails, stop immediately and report the error
- Do NOT proceed to the next step if the current step failed
- Provide clear instructions on how to fix the issue
- If user cancels at checkpoint, offer to revert the version bump commit

## Notes

- Ensure you're on the `main` branch before releasing
- All changes should be committed before starting the release
- The build must pass before creating any commits or tags
