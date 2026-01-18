# Contributing to Grovr

Thanks for your interest in contributing to Grovr!

## Getting Started

1. Fork the repository
2. Clone your fork
   ```bash
   git clone https://github.com/YOUR_USERNAME/grovr.git
   cd grovr
   ```
3. Install dependencies
   ```bash
   pnpm install
   ```
4. Run in development mode
   ```bash
   pnpm tauri dev
   ```

## Development

### Project Structure

```
src/                  # React frontend
  components/ui/      # Reusable UI components
  pages/              # Page components
  lib/api.ts          # Tauri IPC bridge

src-tauri/            # Rust backend
  src/commands/       # Tauri commands (git.rs, settings.rs, integrations.rs)

e2e/                  # Playwright E2E tests
```

### Running Tests

```bash
pnpm test:e2e       # All E2E tests
pnpm test:smoke     # Quick smoke tests
pnpm test:critical  # Critical path tests
```

### Code Style

- **Frontend**: TypeScript with strict mode, TailwindCSS for styling
- **Backend**: Rust 2021 edition, use `thiserror` for error handling
- **Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/)

## Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Run tests to ensure nothing is broken
4. Submit a PR with a clear description

## Releasing (Maintainers)

Releases are done locally using Claude Code skills:

```bash
/bump 0.6.0    # Update version in all config files, commit
/build         # Build signed app with notarization
/release       # Create GitHub release with artifacts
```

**Required environment variables:**

```bash
# Apple code signing
export APPLE_SIGNING_IDENTITY="Developer ID Application: ..."
export APPLE_ID="your@email.com"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="XXXXXXXXXX"

# Tauri update signing
export TAURI_SIGNING_PRIVATE_KEY="/path/to/key"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="password"
```

## Reporting Issues

Found a bug or have a feature request? Please [open an issue](https://github.com/j1king/grovr/issues/new).
