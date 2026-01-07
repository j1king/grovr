# Tauri & Rust Rules

## Commands

- Use `async` for I/O or heavy work to prevent UI freezes
- Return `Result<T, String>` - use `thiserror` for custom error types
- Access shared state via `State<T>` parameter
- NEVER panic in commands - crashes sync commands, hangs async ones
- NEVER use `anyhow::Result` (no Serialize impl)

## Error Handling

- Use `thiserror` with manual `Serialize` impl for custom errors
- Simple cases: `.map_err(|e| e.to_string())`
- Make error types explicit so callers know what can fail

## Security

- Store tokens via `keyring` crate (OS secure storage)
- NEVER return tokens to frontend - return metadata only (is_configured, etc.)
- Check `src-tauri/capabilities/` for Tauri v2 permissions

## Git Operations

- Use `git2` crate for repository operations
- Fall back to `std::process::Command` when git2 lacks features
- Always handle errors gracefully - no unwrap on user paths

## Platform-Specific

- Use `#[cfg(target_os = "macos")]` for platform code
- macOS: window-vibrancy, SMAppService for login items
- Non-macOS: tauri-plugin-autostart

## Plugins Used

store, dialog, shell, global-shortcut, clipboard-manager, window-state, opener
