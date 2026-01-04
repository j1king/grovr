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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitHubConfig {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub config_type: String,
    pub host: Option<String>,
    pub token: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JiraView {
    pub id: String,
    pub name: String,
    pub jql: String,
    pub columns: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JiraConfig {
    pub id: String,
    pub name: String,
    pub host: String,
    pub email: String,
    pub api_token: String,
    pub views: Vec<JiraView>,
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
    pub clipboard_parse_pattern: Option<String>,
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
    pub github_configs: Vec<GitHubConfig>,
    #[serde(default)]
    pub jira_configs: Vec<JiraConfig>,
    #[serde(default)]
    pub worktree_memos: HashMap<String, WorktreeMemo>,
}

fn default_theme() -> String {
    "system".to_string()
}

fn default_refresh_interval() -> i32 {
    5
}
