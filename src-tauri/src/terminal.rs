use std::process::Command;

pub(crate) fn app_command(app: &str, path: &str) -> Command {
    let mut command = Command::new("/usr/bin/open");
    // Keep app names and worktree paths as literal arguments, never shell code.
    command.args(["-a", app, "--", path]);
    command
}

pub(crate) fn open(app: &str, path: &str) -> Result<(), String> {
    let output = app_command(app, path)
        .output()
        .map_err(|e| format!("Failed to open {}: {}", app, e))?;
    if !output.status.success() {
        return Err(format!(
            "Failed to open {}: {}",
            app,
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    Ok(())
}
