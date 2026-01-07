use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct IdeConfig {
    #[serde(rename = "type")]
    pub ide_type: String,
    pub preset: Option<String>,
    pub custom_command: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectConfig {
    pub name: String,
    pub repo_path: String,
    pub default_base_branch: Option<String>,
    pub ide: Option<IdeConfig>,
    pub emoji: Option<String>,
}

// Full config sent from frontend (includes token)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitHubConfig {
    pub id: String,
    pub name: String,
    pub config_type: String,
    pub host: Option<String>,
    pub token: String,
}

// Metadata stored in settings.json (no token)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitHubConfigMeta {
    pub id: String,
    pub name: String,
    pub config_type: String,
    pub host: Option<String>,
}

impl From<&GitHubConfig> for GitHubConfigMeta {
    fn from(config: &GitHubConfig) -> Self {
        GitHubConfigMeta {
            id: config.id.clone(),
            name: config.name.clone(),
            config_type: config.config_type.clone(),
            host: config.host.clone(),
        }
    }
}

// Full config sent from frontend (includes token)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JiraConfig {
    pub host: String,
    pub email: Option<String>,
    pub api_token: Option<String>,
    pub display_name: Option<String>,
}

// Metadata stored in settings.json (no token)
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JiraConfigMeta {
    pub host: String,
    pub email: Option<String>,
    pub display_name: Option<String>,
    #[serde(default)]
    pub has_token: bool,
}

impl From<&JiraConfig> for JiraConfigMeta {
    fn from(config: &JiraConfig) -> Self {
        JiraConfigMeta {
            host: config.host.clone(),
            email: config.email.clone(),
            display_name: config.display_name.clone(),
            has_token: false, // Will be set by get_jira_config
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct WorktreeMemo {
    pub description: Option<String>,
    pub issue_number: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct AppSettings {
    #[serde(default)]
    pub ide: Option<IdeConfig>,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default)]
    pub launch_at_startup: Option<bool>,
    #[serde(default)]
    pub default_worktree_template: Option<String>,
    #[serde(default)]
    pub copy_paths: Option<Vec<String>>,
    #[serde(default)]
    pub fetch_before_create: Option<bool>,
    #[serde(default)]
    pub clipboard_parse_patterns: Option<Vec<String>>,
    #[serde(default)]
    pub last_used_project: Option<String>,
    #[serde(default = "default_refresh_interval")]
    pub refresh_interval_minutes: i32,
    #[serde(default)]
    pub skip_open_ide_confirm: Option<bool>,
    #[serde(default)]
    pub onboarding_completed: Option<bool>,
    #[serde(default)]
    pub projects: Vec<ProjectConfig>,
    #[serde(default)]
    pub github_configs: Vec<GitHubConfigMeta>,
    #[serde(default)]
    pub jira_configs: Vec<JiraConfigMeta>,
    #[serde(default)]
    pub worktree_memos: HashMap<String, WorktreeMemo>,
    #[serde(default)]
    pub global_shortcut: Option<String>,
}

fn default_theme() -> String {
    "system".to_string()
}

fn default_refresh_interval() -> i32 {
    5
}
