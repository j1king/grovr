---
description: Launch Grovr Desktop preview for manual UI testing
allowed-tools: Bash(./scripts/preview.sh:*), Bash(pnpm:*), Bash(cat:*), Bash(tail:*), Read, Grep, TodoWrite, AskUserQuestion
---

# Preview Command

Launch Grovr Desktop with an isolated test environment for manual UI verification.

## Current State

- **Worktree**: !`basename $(pwd)`
- **Preview status**: !`./scripts/preview.sh status 2>&1 | grep -E "(RUNNING|STOPPED)" || echo "Unknown"`

## Preview Workflow

### Step 1: Start Preview

Run the preview script in background:
```bash
./scripts/preview.sh start
```

This will:
1. Create a test git repository with sample worktrees
2. Configure the app with isolated test data
3. Launch the Tauri app with hot-reload enabled
4. Auto-cleanup when the app window is closed

### Step 2: Inform User

Tell the user:
- The preview app is running
- They can test the UI and report any issues
- Hot-reload is enabled for frontend changes

### Step 3: Monitor for Issues

If the user reports issues:
1. Check the log file for errors:
   ```bash
   tail -100 /tmp/grovr-preview-$(basename $(pwd))/preview.log
   ```
2. Analyze the error and suggest fixes
3. Frontend changes will hot-reload automatically

### Step 4: Cleanup

When the user is done testing:
```bash
./scripts/preview.sh stop
```

This cleans up all test data and temporary files.

## Test Environment

The preview creates these sample worktrees for testing:
- `feature-auth` - Login/authentication implementation
- `feature-ui` - UI components
- `bugfix-123` - Bug fix branch
- `PROJ-101` - User profile page (Jira issue)
- `PROJ-202` - Dashboard widget (Jira issue)

## Commands Reference

| Command | Description |
|---------|-------------|
| `./scripts/preview.sh start` | Start preview (default) |
| `./scripts/preview.sh stop` | Stop and cleanup |
| `./scripts/preview.sh status` | Check running status |

## Notes

- Your real settings are backed up and isolated from test data
- Multiple worktrees can run preview simultaneously (different ports)
- Test environment is created in `/tmp/grovr-preview-{worktree}/`
- All changes made during preview are isolated from your real data
