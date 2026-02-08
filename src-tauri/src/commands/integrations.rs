use crate::commands::settings::SettingsState;
use crate::secure_store;
use crate::types::{GitHubConfig, GitHubConfigMeta, JiraConfig, JiraConfigMeta};
use base64::{engine::general_purpose::STANDARD, Engine};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;
use tauri_plugin_store::StoreExt;

const STORE_PATH: &str = "settings.json";
const SETTINGS_KEY: &str = "settings";

// Helper to migrate tokens from old settings.json format to keychain
fn migrate_token_if_needed(app: &tauri::AppHandle, key: &str, token_getter: impl Fn(&Value) -> Option<String>) {
    // Check if token already exists in keychain
    if let Ok(Some(_)) = secure_store::get_secret(key) {
        return; // Already migrated
    }

    // Try to read from raw settings.json
    if let Ok(store) = app.store(STORE_PATH) {
        if let Some(settings_value) = store.get(SETTINGS_KEY) {
            if let Some(token) = token_getter(&settings_value) {
                if !token.is_empty() {
                    let _ = secure_store::store_secret(key, &token);
                }
            }
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidateResult {
    pub valid: bool,
    pub username: Option<String>,
    pub error: Option<String>,
}

// ============ GitHub Commands ============

#[tauri::command]
pub fn get_github_config(
    state: State<SettingsState>,
) -> Result<Option<GitHubConfigMeta>, String> {
    let settings = state.0.lock().map_err(|e| e.to_string())?;
    Ok(settings.github_configs.first().cloned())
}

#[tauri::command]
pub fn set_github_config(
    app: tauri::AppHandle,
    state: State<SettingsState>,
    config: GitHubConfig,
) -> Result<(), String> {
    // Store token in secure storage
    let token_key = secure_store::github_token_key(&config.id);
    secure_store::store_secret(&token_key, &config.token)?;

    // Store metadata (without token) in settings
    let mut settings = state.0.lock().map_err(|e| e.to_string())?;
    let meta: GitHubConfigMeta = (&config).into();
    settings.github_configs = vec![meta];
    save_settings(&app, &settings)
}

#[tauri::command]
pub fn remove_github_config(
    app: tauri::AppHandle,
    state: State<SettingsState>,
) -> Result<(), String> {
    let mut settings = state.0.lock().map_err(|e| e.to_string())?;

    // Delete token from secure storage
    for meta in &settings.github_configs {
        let token_key = secure_store::github_token_key(&meta.id);
        let _ = secure_store::delete_secret(&token_key); // Ignore errors
    }

    settings.github_configs.clear();
    save_settings(&app, &settings)
}

#[tauri::command]
pub async fn validate_github_token(config: GitHubConfig) -> Result<ValidateResult, String> {
    let client = Client::new();

    let base_url = if config.config_type == "enterprise" {
        format!("https://{}/api/v3", config.host.as_deref().unwrap_or("github.com"))
    } else {
        "https://api.github.com".to_string()
    };

    let response = client
        .get(format!("{}/user", base_url))
        .header("Authorization", format!("Bearer {}", config.token))
        .header("User-Agent", "Grovr-Desktop")
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        #[derive(Deserialize)]
        struct GitHubUser {
            login: String,
        }
        let user: GitHubUser = response.json().await.map_err(|e| e.to_string())?;
        Ok(ValidateResult {
            valid: true,
            username: Some(user.login),
            error: None,
        })
    } else {
        let status = response.status().as_u16();
        let error = match status {
            401 => "Invalid token".to_string(),
            403 => "Token has insufficient permissions".to_string(),
            404 => "GitHub API not found (check enterprise URL)".to_string(),
            _ => format!("GitHub API error: {}", status),
        };
        Ok(ValidateResult {
            valid: false,
            username: None,
            error: Some(error),
        })
    }
}

// ============ Jira Commands ============

#[tauri::command]
pub fn get_jira_config(
    state: State<SettingsState>,
) -> Result<Option<JiraConfigMeta>, String> {
    let settings = state.0.lock().map_err(|e| e.to_string())?;
    let meta = settings.jira_configs.first().cloned();

    // Check if token exists in keychain
    if let Some(mut m) = meta {
        let token_key = secure_store::jira_token_key(&m.host);
        m.has_token = secure_store::get_secret(&token_key)
            .ok()
            .flatten()
            .map(|t| !t.is_empty())
            .unwrap_or(false);
        Ok(Some(m))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn set_jira_config(
    app: tauri::AppHandle,
    state: State<SettingsState>,
    config: JiraConfig,
) -> Result<(), String> {
    eprintln!("[Jira] set_jira_config called - host: {}, email: {:?}, has_token: {}",
        config.host, config.email, config.api_token.is_some());

    // Store token in secure storage if provided
    if let Some(ref token) = config.api_token {
        if !token.is_empty() {
            let token_key = secure_store::jira_token_key(&config.host);
            eprintln!("[Jira] Storing token with key: {}, token_len: {}", token_key, token.len());
            match secure_store::store_secret(&token_key, token) {
                Ok(()) => eprintln!("[Jira] Token stored successfully"),
                Err(e) => {
                    eprintln!("[Jira] Failed to store token: {}", e);
                    return Err(e);
                }
            }
        } else {
            eprintln!("[Jira] Token provided but empty, skipping storage");
        }
    } else {
        eprintln!("[Jira] No token provided");
    }

    // Store metadata (without token) in settings
    let mut settings = state.0.lock().map_err(|e| e.to_string())?;
    let meta: JiraConfigMeta = (&config).into();
    settings.jira_configs = vec![meta];
    save_settings(&app, &settings)
}

#[tauri::command]
pub fn remove_jira_config(
    app: tauri::AppHandle,
    state: State<SettingsState>,
) -> Result<(), String> {
    let mut settings = state.0.lock().map_err(|e| e.to_string())?;

    // Delete token from secure storage
    for meta in &settings.jira_configs {
        let token_key = secure_store::jira_token_key(&meta.host);
        let _ = secure_store::delete_secret(&token_key); // Ignore errors
    }

    settings.jira_configs.clear();
    save_settings(&app, &settings)
}

#[tauri::command]
pub async fn validate_jira_credentials(config: JiraConfig) -> Result<ValidateResult, String> {
    let email = config.email.as_ref().filter(|e| !e.is_empty())
        .ok_or("Email is required for validation")?;
    let api_token = config.api_token.as_ref().filter(|t| !t.is_empty())
        .ok_or("API token is required for validation")?;

    let client = Client::new();

    let auth = STANDARD.encode(format!("{}:{}", email, api_token));
    let base_url = format!("https://{}/rest/api/3", config.host);

    let response = client
        .get(format!("{}/myself", base_url))
        .header("Authorization", format!("Basic {}", auth))
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        #[derive(Deserialize)]
        struct JiraUser {
            #[serde(rename = "displayName")]
            display_name: String,
        }
        let user: JiraUser = response.json().await.map_err(|e| e.to_string())?;
        Ok(ValidateResult {
            valid: true,
            username: Some(user.display_name),
            error: None,
        })
    } else {
        let status = response.status().as_u16();
        let error = match status {
            401 => "Invalid email or API token".to_string(),
            403 => "Access denied".to_string(),
            404 => "Jira instance not found (check host URL)".to_string(),
            _ => format!("Jira API error: {}", status),
        };
        Ok(ValidateResult {
            valid: false,
            username: None,
            error: Some(error),
        })
    }
}

// ============ GitHub Data Fetching ============

#[derive(Debug, Serialize, Deserialize)]
pub struct PullRequestInfo {
    pub number: i32,
    pub title: String,
    pub state: String,
    pub merged: bool,
    pub draft: bool,
    pub url: String,
    pub review_decision: Option<String>,
    pub checks_status: Option<String>,
}

#[tauri::command]
pub async fn fetch_pull_requests(
    app: tauri::AppHandle,
    state: State<'_, SettingsState>,
    owner: String,
    repo: String,
    branch: String,
) -> Result<Vec<PullRequestInfo>, String> {
    // Extract config data before await to avoid holding MutexGuard across await
    let (base_url, token) = {
        let settings = state.0.lock().map_err(|e| e.to_string())?;
        let meta = settings.github_configs.first()
            .ok_or("No GitHub config found")?;

        let base_url = if meta.config_type == "enterprise" {
            format!("https://{}/api/v3", meta.host.as_deref().unwrap_or("github.com"))
        } else {
            "https://api.github.com".to_string()
        };

        // Get token from secure storage (with migration from old format)
        let token_key = secure_store::github_token_key(&meta.id);
        let meta_id = meta.id.clone();
        migrate_token_if_needed(&app, &token_key, |settings_value| {
            settings_value
                .get("github_configs")
                .and_then(|arr| arr.as_array())
                .and_then(|arr| arr.iter().find(|c| c.get("id").and_then(|v| v.as_str()) == Some(meta_id.as_str())))
                .and_then(|c| c.get("token"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        });
        let token = secure_store::get_secret(&token_key)?.unwrap_or_default();
        if token.is_empty() {
            eprintln!("[GitHub] Warning: No token found in secure storage for key: {}", token_key);
        }
        (base_url, token)
    };

    let url = format!("{}/repos/{}/{}/pulls", base_url, owner, repo);
    let head_filter = format!("{}:{}", owner, branch);
    eprintln!("[GitHub] Fetching PRs: {} head={}", url, head_filter);

    let client = Client::new();
    let response = client
        .get(&url)
        .query(&[("head", head_filter), ("state", "all".to_string())])
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "Grovr-Desktop")
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let status = response.status().as_u16();
        let body = response.text().await.unwrap_or_default();
        eprintln!("[GitHub] API error ({}): {}", status, body);
        return Err(format!("GitHub API error ({}): {}", status, body));
    }

    #[derive(Deserialize)]
    struct GitHubPR {
        number: i32,
        title: String,
        state: String,
        merged_at: Option<String>,
        draft: bool,
        html_url: String,
    }

    let prs: Vec<GitHubPR> = response.json().await.map_err(|e| e.to_string())?;

    Ok(prs.into_iter().map(|pr| PullRequestInfo {
        number: pr.number,
        title: pr.title,
        state: pr.state,
        merged: pr.merged_at.is_some(),
        draft: pr.draft,
        url: pr.html_url,
        review_decision: None,
        checks_status: None,
    }).collect())
}

// ============ Jira Data Fetching ============

#[derive(Debug, Serialize, Deserialize)]
pub struct JiraIssueInfo {
    pub key: String,
    pub summary: String,
    pub status: String,
    pub status_category: String,
    pub url: String,
}

#[tauri::command]
pub async fn fetch_jira_issue(
    app: tauri::AppHandle,
    state: State<'_, SettingsState>,
    issue_key: String,
) -> Result<Option<JiraIssueInfo>, String> {
    eprintln!("[Jira] fetch_jira_issue called for: {}", issue_key);

    // Extract config data before await to avoid holding MutexGuard across await
    let (auth, base_url, host) = {
        let settings = state.0.lock().map_err(|e| e.to_string())?;
        let meta = match settings.jira_configs.first() {
            Some(m) => m,
            None => {
                eprintln!("[Jira] No config found");
                return Ok(None);
            }
        };

        eprintln!("[Jira] Config found - host: {}, email: {:?}", meta.host, meta.email);

        // Check if email is configured - if not, skip API call (links-only mode)
        let email = match &meta.email {
            Some(e) if !e.is_empty() => e.clone(),
            _ => {
                eprintln!("[Jira] No email configured");
                return Ok(None);
            }
        };

        // Get token from secure storage (with migration from old format)
        let token_key = secure_store::jira_token_key(&meta.host);
        eprintln!("[Jira] Looking for token with key: {}", token_key);

        let meta_host = meta.host.clone();
        migrate_token_if_needed(&app, &token_key, |settings_value| {
            settings_value
                .get("jira_configs")
                .and_then(|arr| arr.as_array())
                .and_then(|arr| arr.iter().find(|c| c.get("host").and_then(|v| v.as_str()) == Some(meta_host.as_str())))
                .and_then(|c| c.get("api_token"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        });

        let api_token = match secure_store::get_secret(&token_key) {
            Ok(Some(t)) => {
                eprintln!("[Jira] Token found, length: {}", t.len());
                t
            }
            Ok(None) => {
                eprintln!("[Jira] No token in keychain");
                return Ok(None);
            }
            Err(e) => {
                eprintln!("[Jira] Error getting token: {}", e);
                return Ok(None);
            }
        };

        // Skip API call if no token
        if api_token.is_empty() {
            eprintln!("[Jira] Token is empty");
            return Ok(None);
        }

        let auth = STANDARD.encode(format!("{}:{}", email, api_token));
        let base_url = format!("https://{}/rest/api/3", meta.host);
        eprintln!("[Jira] Making API call to: {}/issue/{}", base_url, issue_key);
        (auth, base_url, meta.host.clone())
    };

    let client = Client::new();

    let response = client
        .get(format!("{}/issue/{}", base_url, issue_key))
        .query(&[("fields", "summary,status")])
        .header("Authorization", format!("Basic {}", auth))
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| {
            eprintln!("[Jira] Request error: {}", e);
            e.to_string()
        })?;

    eprintln!("[Jira] Response status: {}", response.status());

    if !response.status().is_success() {
        let status = response.status().as_u16();
        let body = response.text().await.unwrap_or_default();
        eprintln!("[Jira] API error ({}): {}", status, body);
        return Err(format!("Jira API error ({}): {}", status, body));
    }

    #[derive(Deserialize)]
    struct JiraIssue {
        key: String,
        fields: JiraFields,
    }
    #[derive(Deserialize)]
    struct JiraFields {
        summary: String,
        status: JiraStatus,
    }
    #[derive(Deserialize)]
    struct JiraStatus {
        name: String,
        #[serde(rename = "statusCategory")]
        status_category: JiraStatusCategory,
    }
    #[derive(Deserialize)]
    struct JiraStatusCategory {
        key: String,
    }

    let issue: JiraIssue = response.json().await.map_err(|e| e.to_string())?;

    Ok(Some(JiraIssueInfo {
        key: issue.key.clone(),
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        status_category: issue.fields.status.status_category.key,
        url: format!("https://{}/browse/{}", host, issue.key),
    }))
}

// Helper to save settings
fn save_settings(app: &tauri::AppHandle, settings: &crate::types::AppSettings) -> Result<(), String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    store.set(
        SETTINGS_KEY,
        serde_json::to_value(settings).map_err(|e| e.to_string())?,
    );
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}
