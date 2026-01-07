# CLAUDE.md - Grovr Desktop

## Project Overview

Grovr is a desktop Git worktree manager built with Tauri v2 (Rust backend) and React 19 (TypeScript frontend). It provides a native desktop experience for managing git worktrees with GitHub/Jira integrations.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 7, TailwindCSS 3, Radix UI
- **Backend**: Rust 2021, Tauri v2, git2 (libgit2), tokio
- **Testing**: Playwright (E2E)
- **Build**: pnpm, Cargo

## Project Structure

```
src/                  # React frontend
  components/ui/      # Reusable UI components (Button, ScrollArea)
  pages/              # Page components with routing
  lib/api.ts          # Tauri IPC bridge to Rust backend
  types/              # TypeScript interfaces

src-tauri/            # Rust backend
  src/commands/       # Tauri commands (git.rs, settings.rs, integrations.rs)
  src/secure_store.rs # Keyring-based credential storage

e2e/                  # Playwright E2E tests
scripts/              # Automation scripts (preview.sh, release)
```

## Essential Commands

```bash
# Development
pnpm dev              # Start Vite dev server
pnpm tauri dev        # Run Tauri app in dev mode

# Build
pnpm build            # Build frontend
cargo build --manifest-path src-tauri/Cargo.toml --release

# Testing
pnpm test:e2e         # All E2E tests
pnpm test:smoke       # Quick smoke tests
pnpm test:critical    # Critical path tests

# Release (use /release skill)
/release <version>    # e.g., /release 0.2.1
```

## Core Principles

### Tauri IPC

- All Rust commands are in `src-tauri/src/commands/`
- Frontend calls via `api.ts` using `invoke()` from `@tauri-apps/api/core`
- Commands return `Result<T, String>` - use `thiserror` for custom errors
- NEVER panic in commands - it crashes the app

### Type Safety

- Match TypeScript types in `src/types/` with Rust types in `src-tauri/src/types.rs`
- Use strict TypeScript (`tsconfig.json` has strict mode enabled)

### Styling

- Use TailwindCSS utility classes exclusively
- Dark mode via `.dark` class on root element
- Use CVA (class-variance-authority) for component variants
- CSS variables for theming in `src/index.css`

### Git Operations

- Use `git2` crate for repository operations
- Fall back to `std::process::Command` when git2 lacks features
- Handle all error cases gracefully

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/api.ts` | Frontend-to-backend IPC bridge |
| `src-tauri/src/lib.rs` | Tauri app setup, plugins, window effects |
| `src-tauri/src/commands/git.rs` | Git/worktree operations |
| `src-tauri/src/commands/settings.rs` | App settings management |
| `src-tauri/src/commands/integrations.rs` | GitHub/Jira API integrations |

## Testing

- E2E tests use Playwright with custom Tauri fixture
- Tag tests with `@smoke`, `@critical`, `@worktree`, `@settings`, `@theme`
- Test isolation: each test runs independently
- Use `/preview` skill to launch isolated test environment

## Rules

Detailed guidelines are in `.claude/rules/`:

- `tauri.md` - Tauri/Rust patterns and error handling
- `react.md` - React/TypeScript conventions
- `testing.md` - E2E testing guidelines
- `styling.md` - TailwindCSS and UI patterns

## Don'ts

- Don't use `anyhow` in Tauri commands (no Serialize impl)
- Don't expose tokens to frontend - use metadata-only responses
- Don't skip tests when modifying critical paths
- Don't use pure black in dark mode - use `gray-900` or similar
