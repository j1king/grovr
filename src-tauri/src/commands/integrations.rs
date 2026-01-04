use crate::commands::settings::SettingsState;
use crate::types::{GitHubConfig, JiraConfig};
use base64::{engine::general_purpose::STANDARD, Engine};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::State;
use tauri_plugin_store::StoreExt;

const STORE_PATH: &str = "settings.json";
const SETTINGS_KEY: &str = "settings";

#[derive(Debug, Serialize, Deserialize)]
pub struct ValidateResult {
    pub valid: bool,
    pub username: Option<String>,
    pub error: Option<String>,
}

// ============ GitHub Commands ============

#[tauri::command]
pub fn get_github_config(state: State<SettingsState>) -> Result<Option<GitHubConfig>, String> {
    let settings = state.0.lock().map_err(|e| e.to_string())?;
    Ok(settings.github_configs.first().cloned())
}

#[tauri::command]
pub fn set_github_config(
    app: tauri::AppHandle,
    state: State<SettingsState>,
    config: GitHubConfig,
) -> Result<(), String> {
    let mut settings = state.0.lock().map_err(|e| e.to_string())?;
    // Single connection: replace all with one
    settings.github_configs = vec![config];
    save_settings(&app, &settings)
}

#[tauri::command]
pub fn remove_github_config(
    app: tauri::AppHandle,
    state: State<SettingsState>,
) -> Result<(), String> {
    let mut settings = state.0.lock().map_err(|e| e.to_string())?;
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
pub fn get_jira_config(state: State<SettingsState>) -> Result<Option<JiraConfig>, String> {
    let settings = state.0.lock().map_err(|e| e.to_string())?;
    Ok(settings.jira_configs.first().cloned())
}

#[tauri::command]
pub fn set_jira_config(
    app: tauri::AppHandle,
    state: State<SettingsState>,
    config: JiraConfig,
) -> Result<(), String> {
    let mut settings = state.0.lock().map_err(|e| e.to_string())?;
    // Single connection: replace all with one
    settings.jira_configs = vec![config];
    save_settings(&app, &settings)
}

#[tauri::command]
pub fn remove_jira_config(
    app: tauri::AppHandle,
    state: State<SettingsState>,
) -> Result<(), String> {
    let mut settings = state.0.lock().map_err(|e| e.to_string())?;
    settings.jira_configs.clear();
    save_settings(&app, &settings)
}

#[tauri::command]
pub async fn validate_jira_credentials(config: JiraConfig) -> Result<ValidateResult, String> {
    let client = Client::new();

    let auth = STANDARD.encode(format!("{}:{}", config.email, config.api_token));
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
    state: State<'_, SettingsState>,
    owner: String,
    repo: String,
    branch: String,
) -> Result<Vec<PullRequestInfo>, String> {
    // Extract config data before await to avoid holding MutexGuard across await
    let (base_url, token) = {
        let settings = state.0.lock().map_err(|e| e.to_string())?;
        let config = settings.github_configs.first()
            .ok_or("No GitHub config found")?;

        let base_url = if config.config_type == "enterprise" {
            format!("https://{}/api/v3", config.host.as_deref().unwrap_or("github.com"))
        } else {
            "https://api.github.com".to_string()
        };
        (base_url, config.token.clone())
    };

    let client = Client::new();
    let response = client
        .get(format!("{}/repos/{}/{}/pulls", base_url, owner, repo))
        .query(&[("head", format!("{}:{}", owner, branch)), ("state", "all".to_string())])
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "Grovr-Desktop")
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Ok(vec![]);
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
    state: State<'_, SettingsState>,
    issue_key: String,
) -> Result<Option<JiraIssueInfo>, String> {
    // Extract config data before await to avoid holding MutexGuard across await
    let (auth, base_url, host) = {
        let settings = state.0.lock().map_err(|e| e.to_string())?;
        let config = settings.jira_configs.first()
            .ok_or("No Jira config found")?;

        let auth = STANDARD.encode(format!("{}:{}", config.email, config.api_token));
        let base_url = format!("https://{}/rest/api/3", config.host);
        (auth, base_url, config.host.clone())
    };

    let client = Client::new();

    let response = client
        .get(format!("{}/issue/{}", base_url, issue_key))
        .query(&[("fields", "summary,status")])
        .header("Authorization", format!("Basic {}", auth))
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Ok(None);
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
