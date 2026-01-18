const SERVICE_NAME: &str = "grovr";

#[cfg(not(target_os = "macos"))]
use keyring::Entry;

#[cfg(not(target_os = "macos"))]
fn get_entry(key: &str) -> Result<Entry, String> {
    Entry::new(SERVICE_NAME, key).map_err(|e| e.to_string())
}

/// Store a secret in the system keychain.
/// On macOS, uses the `security` command for reliability.
/// On other platforms, uses the keyring crate.
pub fn store_secret(key: &str, secret: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        store_secret_macos(key, secret)
    }

    #[cfg(not(target_os = "macos"))]
    {
        let entry = get_entry(key)?;
        entry.set_password(secret).map_err(|e| e.to_string())
    }
}

/// Retrieve a secret from the system keychain.
/// Returns Ok(None) if the secret is not found.
pub fn get_secret(key: &str) -> Result<Option<String>, String> {
    #[cfg(target_os = "macos")]
    {
        get_secret_macos(key)
    }

    #[cfg(not(target_os = "macos"))]
    {
        let entry = get_entry(key)?;
        match entry.get_password() {
            Ok(password) => Ok(Some(password)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }
}

/// Delete a secret from the system keychain.
/// Returns Ok(()) even if the secret doesn't exist.
pub fn delete_secret(key: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        delete_secret_macos(key)
    }

    #[cfg(not(target_os = "macos"))]
    {
        let entry = get_entry(key)?;
        match entry.delete_credential() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }
}

// ============ macOS Implementation using security command ============
// The keyring crate v3 has reliability issues on macOS where set_password
// returns Ok(()) but doesn't actually store the password. Using Apple's
// native `security` command directly is more reliable.

#[cfg(target_os = "macos")]
fn store_secret_macos(key: &str, secret: &str) -> Result<(), String> {
    use std::process::Command;

    // Delete existing entry first (ignore errors - entry may not exist)
    let _ = Command::new("security")
        .args(["delete-generic-password", "-s", SERVICE_NAME, "-a", key])
        .output();

    let output = Command::new("security")
        .args([
            "add-generic-password",
            "-s", SERVICE_NAME,
            "-a", key,
            "-w", secret,
            "-U", // Update if exists (though we deleted above)
        ])
        .output()
        .map_err(|e| format!("Failed to execute security command: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[cfg(target_os = "macos")]
fn get_secret_macos(key: &str) -> Result<Option<String>, String> {
    use std::process::Command;

    let output = Command::new("security")
        .args(["find-generic-password", "-s", SERVICE_NAME, "-a", key, "-w"])
        .output()
        .map_err(|e| format!("Failed to execute security command: {}", e))?;

    if output.status.success() {
        let password = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(Some(password))
    } else {
        // Exit code 44 means "item not found" - this is not an error
        Ok(None)
    }
}

#[cfg(target_os = "macos")]
fn delete_secret_macos(key: &str) -> Result<(), String> {
    use std::process::Command;

    let output = Command::new("security")
        .args(["delete-generic-password", "-s", SERVICE_NAME, "-a", key])
        .output()
        .map_err(|e| format!("Failed to execute security command: {}", e))?;

    // Success or "item not found" (exit code 44) are both acceptable
    if output.status.success() || output.status.code() == Some(44) {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

// ============ Key generators for different secrets ============

pub fn github_token_key(id: &str) -> String {
    format!("github-token-{}", id)
}

pub fn jira_token_key(host: &str) -> String {
    format!("jira-token-{}", host)
}
