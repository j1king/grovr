import { invoke } from '@tauri-apps/api/core';

// ============ Types from Backend ============

export interface BackendWorktree {
  path: string;
  branch: string;
  is_main: boolean;
  is_bare: boolean;
}

export interface BackendBranch {
  name: string;
  is_remote: boolean;
  is_head: boolean;
}

export interface BackendWorktreeStatus {
  has_changes: boolean;
  staged: number;
  unstaged: number;
  untracked: number;
}

export interface BackendIdeConfig {
  type: string;
  preset?: string;
  custom_command?: string;
}

export interface BackendProjectConfig {
  name: string;
  repo_path: string;
  default_base_branch?: string;
  ide?: BackendIdeConfig;
}

export interface BackendAppSettings {
  ide?: BackendIdeConfig;
  theme: string;
  launch_at_startup?: boolean;
  default_worktree_template?: string;
  copy_paths?: string[];
  fetch_before_create?: boolean;
  clipboard_parse_patterns?: string[];
  last_used_project?: string;
  refresh_interval_minutes: number;
  skip_open_ide_confirm?: boolean;
  onboarding_completed?: boolean;
  projects: BackendProjectConfig[];
  github_configs: unknown[];
  jira_configs: unknown[];
}

// ============ Settings API ============

export async function getSettings(): Promise<BackendAppSettings> {
  return invoke('get_settings');
}

export async function setIde(ide: BackendIdeConfig): Promise<void> {
  return invoke('set_ide', { ide });
}

export async function setTheme(theme: string): Promise<void> {
  return invoke('set_theme', { theme });
}

export async function setLaunchAtStartup(enabled: boolean): Promise<void> {
  return invoke('set_launch_at_startup', { enabled });
}

export async function setDefaultWorktreeTemplate(template: string): Promise<void> {
  return invoke('set_default_worktree_template', { template });
}

export async function setCopyPaths(paths: string[]): Promise<void> {
  return invoke('set_copy_paths', { paths });
}

export async function setFetchBeforeCreate(enabled: boolean): Promise<void> {
  return invoke('set_fetch_before_create', { enabled });
}

export async function setClipboardParsePatterns(patterns: string[]): Promise<void> {
  return invoke('set_clipboard_parse_patterns', { patterns });
}

export async function setLastUsedProject(project: string): Promise<void> {
  return invoke('set_last_used_project', { project });
}

export async function setRefreshIntervalMinutes(minutes: number): Promise<void> {
  return invoke('set_refresh_interval_minutes', { minutes });
}

export async function setSkipOpenIdeConfirm(skip: boolean): Promise<void> {
  return invoke('set_skip_open_ide_confirm', { skip });
}

export async function setOnboardingCompleted(completed: boolean): Promise<void> {
  return invoke('set_onboarding_completed', { completed });
}

// ============ Projects API ============

export async function getProjects(): Promise<BackendProjectConfig[]> {
  return invoke('get_projects');
}

export async function addProject(project: BackendProjectConfig): Promise<void> {
  return invoke('add_project', { project });
}

export async function updateProject(repoPath: string, project: BackendProjectConfig): Promise<void> {
  return invoke('update_project', { repoPath, project });
}

export async function removeProject(repoPath: string): Promise<void> {
  return invoke('remove_project', { repoPath });
}

// ============ Git - Worktree API ============

export async function getWorktrees(repoPath: string): Promise<BackendWorktree[]> {
  return invoke('get_worktrees', { repoPath });
}

export async function createWorktree(
  repoPath: string,
  worktreePath: string,
  branchName: string,
  baseBranch: string
): Promise<void> {
  return invoke('create_worktree', { repoPath, worktreePath, branchName, baseBranch });
}

export async function createWorktreeExistingBranch(
  repoPath: string,
  worktreePath: string,
  branchName: string
): Promise<void> {
  return invoke('create_worktree_existing_branch', { repoPath, worktreePath, branchName });
}

export async function removeWorktree(
  repoPath: string,
  worktreePath: string,
  force: boolean
): Promise<void> {
  return invoke('remove_worktree', { repoPath, worktreePath, force });
}

export async function pruneWorktrees(repoPath: string): Promise<void> {
  return invoke('prune_worktrees', { repoPath });
}

export async function getWorktreeStatus(worktreePath: string): Promise<BackendWorktreeStatus> {
  return invoke('get_worktree_status', { worktreePath });
}

// ============ Git - Branch API ============

export async function getBranches(repoPath: string, includeRemote: boolean): Promise<BackendBranch[]> {
  return invoke('get_branches', { repoPath, includeRemote });
}

export async function getCurrentBranch(repoPath: string): Promise<string> {
  return invoke('get_current_branch', { repoPath });
}

export async function getDefaultBranch(repoPath: string): Promise<string> {
  return invoke('get_default_branch', { repoPath });
}

export async function deleteBranch(repoPath: string, branchName: string, force: boolean): Promise<void> {
  return invoke('delete_branch', { repoPath, branchName, force });
}

export async function renameBranch(repoPath: string, oldName: string, newName: string): Promise<void> {
  return invoke('rename_branch', { repoPath, oldName, newName });
}

// ============ Git - Operations API ============

export async function gitFetch(repoPath: string): Promise<void> {
  return invoke('git_fetch', { repoPath });
}

export async function gitPull(worktreePath: string): Promise<void> {
  return invoke('git_pull', { worktreePath });
}

// ============ IDE/File Operations API ============

export async function openIde(path: string, idePreset: string, customCommand?: string): Promise<void> {
  return invoke('open_ide', { path, idePreset, customCommand });
}

export async function openInFinder(path: string): Promise<void> {
  return invoke('open_in_finder', { path });
}

export async function openTerminal(path: string): Promise<void> {
  return invoke('open_terminal', { path });
}

export async function copyPathsToWorktree(
  sourcePath: string,
  targetPath: string,
  paths: string[]
): Promise<void> {
  return invoke('copy_paths_to_worktree', { sourcePath, targetPath, paths });
}

// ============ Worktree Memo API ============

export interface WorktreeMemo {
  description?: string;
  issue_number?: string;
}

export async function getWorktreeMemo(path: string): Promise<WorktreeMemo> {
  return invoke('get_worktree_memo', { path });
}

export async function setWorktreeMemo(path: string, memo: WorktreeMemo): Promise<void> {
  return invoke('set_worktree_memo', { path, memo });
}

// ============ GitHub Integration API ============

// Full config (used when saving - token sent to backend)
export interface GitHubConfig {
  id: string;
  name: string;
  config_type: 'personal' | 'enterprise';
  token: string;
  host?: string;
  username?: string;
}

// Metadata only (returned from backend - no token exposed)
export interface GitHubConfigMeta {
  id: string;
  name: string;
  config_type: 'personal' | 'enterprise';
  host?: string;
}

export interface ValidateResult {
  valid: boolean;
  username?: string;
  error?: string;
}

export interface PullRequestInfo {
  number: number;
  title: string;
  state: string;
  merged: boolean;
  draft: boolean;
  url: string;
  review_decision?: string;
  checks_status?: string;
}

export async function getGitHubConfig(): Promise<GitHubConfigMeta | null> {
  return invoke('get_github_config');
}

export async function setGitHubConfig(config: GitHubConfig): Promise<void> {
  return invoke('set_github_config', { config });
}

export async function removeGitHubConfig(): Promise<void> {
  return invoke('remove_github_config');
}

export async function validateGitHubToken(config: GitHubConfig): Promise<ValidateResult> {
  return invoke('validate_github_token', { config });
}

export async function fetchPullRequests(
  owner: string,
  repo: string,
  branch: string
): Promise<PullRequestInfo[]> {
  return invoke('fetch_pull_requests', { owner, repo, branch });
}

// ============ Jira Integration API ============

// Full config (used when saving - token sent to backend)
export interface JiraConfig {
  host: string;
  email?: string;
  api_token?: string;
  display_name?: string;
}

// Metadata only (returned from backend - no token exposed)
export interface JiraConfigMeta {
  host: string;
  email?: string;
  display_name?: string;
  has_token?: boolean;
}

export interface JiraIssueInfo {
  key: string;
  summary: string;
  status: string;
  status_category: string;
  url: string;
}

export async function getJiraConfig(): Promise<JiraConfigMeta | null> {
  return invoke('get_jira_config');
}

export async function setJiraConfig(config: JiraConfig): Promise<void> {
  return invoke('set_jira_config', { config });
}

export async function removeJiraConfig(): Promise<void> {
  return invoke('remove_jira_config');
}

export async function validateJiraCredentials(config: JiraConfig): Promise<ValidateResult> {
  return invoke('validate_jira_credentials', { config });
}

export async function fetchJiraIssue(issueKey: string): Promise<JiraIssueInfo | null> {
  return invoke('fetch_jira_issue', { issueKey });
}
