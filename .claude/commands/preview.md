# Preview Command

Launch Grovr Desktop with an isolated test environment for manual UI verification.

## Quick Start

```bash
./scripts/preview.sh
```

This will:
1. Create a test git repository with sample worktrees
2. Configure the app to use the test project
3. Launch the Tauri app
4. Restore original settings on exit (Ctrl+C)

## Test Environment

The preview creates these sample worktrees:
- `feature-auth` - Login/authentication implementation
- `feature-ui` - UI components
- `bugfix-123` - Bug fix branch
- `PROJ-101` - User profile page (with Jira issue)
- `PROJ-202` - Dashboard widget (with Jira issue)

## Usage Notes

- Your real settings are backed up and restored after preview
- Test environment is created in `/tmp/grovr-desktop-test-preview-*/`
- Press Ctrl+C to stop and clean up
- All changes made during preview are isolated from your real data
