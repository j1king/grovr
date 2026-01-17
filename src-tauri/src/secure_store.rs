use keyring::Entry;

const SERVICE_NAME: &str = "grovr";

fn get_entry(key: &str) -> Result<Entry, String> {
    Entry::new(SERVICE_NAME, key).map_err(|e| e.to_string())
}

pub fn store_secret(key: &str, secret: &str) -> Result<(), String> {
    // Try keyring first
    let entry = get_entry(key)?;
    match entry.set_password(secret) {
        Ok(()) => return Ok(()),
        Err(e) => {
            eprintln!("[SecureStore] keyring store failed: {:?}, trying fallback", e);
        }
    }

    // Fallback: macOS security command
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        // Delete existing entry first
        let _ = Command::new("security")
            .args(["delete-generic-password", "-s", SERVICE_NAME, "-a", key])
            .output();

        let output = Command::new("security")
            .args(["add-generic-password", "-s", SERVICE_NAME, "-a", key, "-w", secret])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            return Ok(());
        }
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    #[cfg(not(target_os = "macos"))]
    Err("Failed to store secret".to_string())
}

pub fn get_secret(key: &str) -> Result<Option<String>, String> {
    // Try keyring first
    let entry = get_entry(key)?;
    match entry.get_password() {
        Ok(password) => return Ok(Some(password)),
        Err(keyring::Error::NoEntry) => {
            // Try fallback before returning None
        }
        Err(e) => {
            eprintln!("[SecureStore] keyring get failed: {:?}, trying fallback", e);
        }
    }

    // Fallback: macOS security command
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let output = Command::new("security")
            .args(["find-generic-password", "-s", SERVICE_NAME, "-a", key, "-w"])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            let password = String::from_utf8_lossy(&output.stdout).trim().to_string();
            return Ok(Some(password));
        }
        // Not found
        return Ok(None);
    }

    #[cfg(not(target_os = "macos"))]
    Ok(None)
}

pub fn delete_secret(key: &str) -> Result<(), String> {
    // Try keyring first
    let entry = get_entry(key)?;
    match entry.delete_credential() {
        Ok(()) => return Ok(()),
        Err(keyring::Error::NoEntry) => return Ok(()),
        Err(e) => {
            eprintln!("[SecureStore] keyring delete failed: {:?}, trying fallback", e);
        }
    }

    // Fallback: macOS security command
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let _ = Command::new("security")
            .args(["delete-generic-password", "-s", SERVICE_NAME, "-a", key])
            .output();
        return Ok(());
    }

    #[cfg(not(target_os = "macos"))]
    Ok(())
}

// Key generators for different secrets
pub fn github_token_key(id: &str) -> String {
    format!("github-token-{}", id)
}

pub fn jira_token_key(host: &str) -> String {
    format!("jira-token-{}", host)
}
