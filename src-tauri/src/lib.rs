use tauri::Manager;

#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

#[cfg(target_os = "windows")]
use window_vibrancy::apply_mica;

mod commands;
mod secure_store;
mod types;

use commands::settings::{
    get_settings, get_worktree_memo, init_settings, register_global_shortcut,
    set_clipboard_parse_patterns, set_copy_paths, set_default_worktree_template,
    set_fetch_before_create, set_global_shortcut, set_ide, set_last_used_project,
    set_launch_at_startup, set_onboarding_completed, set_refresh_interval_minutes,
    set_skip_open_ide_confirm, set_theme, set_worktree_memo,
};
use commands::projects::{add_project, get_projects, remove_project, reorder_projects, update_project};
use commands::git::{
    get_worktrees, create_worktree, create_worktree_existing_branch, remove_worktree,
    prune_worktrees, get_worktree_status, get_branches, get_current_branch, get_default_branch,
    delete_branch, rename_branch, git_fetch, git_pull, get_github_remote_info, open_ide,
    open_in_finder, open_terminal, copy_paths_to_worktree,
};
use commands::integrations::{
    get_github_config, set_github_config, remove_github_config, validate_github_token,
    get_jira_config, set_jira_config, remove_jira_config, validate_jira_credentials,
    fetch_pull_requests, fetch_jira_issue,
};

fn setup_window_effects(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let window = app.get_webview_window("main").expect("no main window");

    // Set dynamic window title for preview mode (worktree isolation)
    if let Ok(worktree) = std::env::var("GROVR_PREVIEW_WORKTREE") {
        window.set_title(&format!("Grovr ({})", worktree))?;
    }

    #[cfg(target_os = "macos")]
    {
        let _ = apply_vibrancy(&window, NSVisualEffectMaterial::Sidebar, None, None);
    }

    #[cfg(target_os = "windows")]
    {
        let _ = apply_mica(&window, None);
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        // Plugins
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_liquid_glass::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init());

    // Only use autostart plugin on non-macOS (Windows/Linux)
    // macOS uses SMAppService via smappservice-rs for native login item management
    #[cfg(not(target_os = "macos"))]
    {
        builder = builder.plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::AppleScript,
            None,
        ));
    }

    builder
        // Setup
        .setup(|app| {
            // Initialize settings state
            let settings_state = init_settings(app.handle());

            // Register saved global shortcut on startup
            if let Ok(settings) = settings_state.0.lock() {
                if let Some(ref shortcut) = settings.global_shortcut {
                    let _ = register_global_shortcut(app.handle(), shortcut);
                }
            }

            app.manage(settings_state);

            // Apply window effects
            setup_window_effects(app)?;
            Ok(())
        })
        // Commands
        .invoke_handler(tauri::generate_handler![
            // Settings
            get_settings,
            set_ide,
            set_theme,
            set_launch_at_startup,
            set_default_worktree_template,
            set_copy_paths,
            set_fetch_before_create,
            set_clipboard_parse_patterns,
            set_last_used_project,
            set_refresh_interval_minutes,
            set_skip_open_ide_confirm,
            set_onboarding_completed,
            get_worktree_memo,
            set_worktree_memo,
            set_global_shortcut,
            // Projects
            get_projects,
            add_project,
            update_project,
            remove_project,
            reorder_projects,
            // Git - Worktrees
            get_worktrees,
            create_worktree,
            create_worktree_existing_branch,
            remove_worktree,
            prune_worktrees,
            get_worktree_status,
            // Git - Branches
            get_branches,
            get_current_branch,
            get_default_branch,
            delete_branch,
            rename_branch,
            // Git - Operations
            git_fetch,
            git_pull,
            // Git - Remote
            get_github_remote_info,
            // IDE/File
            open_ide,
            open_in_finder,
            open_terminal,
            copy_paths_to_worktree,
            // Integrations - GitHub
            get_github_config,
            set_github_config,
            remove_github_config,
            validate_github_token,
            fetch_pull_requests,
            // Integrations - Jira
            get_jira_config,
            set_jira_config,
            remove_jira_config,
            validate_jira_credentials,
            fetch_jira_issue,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            // macOS: Show window when dock icon is clicked (Reopen event)
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = event {
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        });
}
