#[path = "../src/types.rs"]
#[allow(dead_code)]
mod types;
#[cfg(target_os = "macos")]
#[path = "../src/terminal.rs"]
mod terminal;

#[test]
fn old_settings_load_without_resetting_existing_preferences() {
    let settings: types::AppSettings = serde_json::from_value(serde_json::json!({
        "theme": "dark",
        "ide": { "type": "preset", "preset": "cursor" },
        "projects": [{ "name": "existing", "repo_path": "/tmp/repo" }]
    })).unwrap();
    assert!(settings.terminal.is_none());
    assert_eq!(settings.theme, "dark");
    assert_eq!(settings.ide.unwrap().preset.as_deref(), Some("cursor"));
    assert_eq!(settings.projects[0].name, "existing");
}

#[test]
fn selected_terminal_survives_settings_round_trip() {
    for app in ["Terminal", "iTerm", "Warp", "/Applications/My Terminal.app"] {
        let mut settings = types::AppSettings::default();
        settings.terminal = Some(types::TerminalConfig { app: app.to_string() });
        let saved = serde_json::to_string(&settings).unwrap();
        let restored: types::AppSettings = serde_json::from_str(&saved).unwrap();
        assert_eq!(restored.terminal.unwrap().app, app);
    }
}

#[cfg(target_os = "macos")]
#[test]
fn launch_preserves_spaces_quotes_and_shell_metacharacters() {
    let app = "/Applications/My Terminal.app";
    let path = "/tmp/a worktree/'quoted' \"double\" $(touch nope); `echo nope`";
    let command = terminal::app_command(app, path);
    let args: Vec<_> = command.get_args().collect();
    assert_eq!(args, ["-a", app, "--", path]);
    assert_eq!(command.get_program(), "/usr/bin/open");
}

#[cfg(target_os = "macos")]
#[test]
fn missing_app_returns_launch_services_error() {
    let result = terminal::open("/nonexistent/grovr-test-missing-terminal.app", "/tmp");
    let error = result.expect_err("A missing app must not silently succeed");
    assert!(error.contains("Failed to open /nonexistent/grovr-test-missing-terminal.app"));
}
