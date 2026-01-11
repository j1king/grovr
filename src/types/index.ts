// Worktree types
export interface Worktree {
  path: string;
  branch: string;
  isMain: boolean;
  description?: string;
  issueNumber?: string;
  repoPath?: string; // Added for edit context
}

export interface Project {
  name: string;
  repoPath: string;
  defaultBaseBranch?: string;
  ide?: IDEPreset;
  worktrees: Worktree[];
}

// IDE types
export type IDEPreset = 'idea' | 'code' | 'cursor' | 'pycharm' | 'webstorm' | 'goland' | 'custom';

export interface IDEConfig {
  preset: IDEPreset;
  customCommand?: string;
}

// Settings types
export interface AppSettings {
  launchAtStartup: boolean;
  autoRefreshInterval: number | null; // minutes, null = off
  skipOpenIDEConfirm: boolean;
  theme: {
    preset: ThemePreset;
    mode: 'system' | 'light' | 'dark';
  };
  ide: IDEConfig;
  worktree: WorktreeSettings;
}

export interface WorktreeSettings {
  defaultPathTemplate: string;
  fetchBeforeCreate: boolean;
  copyPaths: string[];
  clipboardParsePattern: string;
}

// Theme types
export type ThemePreset =
  | 'default' | 'catppuccin' | 'claude' | 'graphite' | 'neo-brutalism' | 'cyberpunk'
  | 'midnight-bloom' | 'pastel-dreams' | 'modern-minimal' | 'violet-bloom' | 't3-chat'
  | 'twitter' | 'mocha-mousse' | 'bubblegum' | 'amethyst-haze' | 'notebook' | 'doom-64'
  | 'perpetuity' | 'kodama-grove' | 'cosmic-night' | 'tangerine' | 'quantum-rose'
  | 'nature' | 'bold-tech' | 'elegant-luxury' | 'amber-minimal' | 'supabase' | 'solar-dusk'
  | 'claymorphism' | 'clean-slate' | 'caffeine' | 'ocean-breeze' | 'retro-arcade'
  | 'candyland' | 'northern-lights' | 'vintage-paper' | 'sunset-horizon' | 'starry-night' | 'vercel';

// GitHub types
export interface GitHubConfig {
  id: string;
  name: string;
  type: 'community' | 'enterprise';
  host?: string;
  token: string;
}

export interface PullRequestInfo {
  number: number;
  title: string;
  state: 'open' | 'closed';
  merged: boolean;
  draft: boolean;
  url: string;
  reviewDecision?: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null;
  checksStatus?: 'success' | 'failure' | 'pending' | null;
  createdAt: string;
  updatedAt: string;
}

// Jira types
export interface JiraConfig {
  id: string;
  name: string;
  host: string;
  email: string;
  apiToken: string;
  views: JiraView[];
}

export interface JiraView {
  id: string;
  name: string;
  jql: string;
}

export interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  statusCategory: 'todo' | 'inprogress' | 'done';
  assignee?: string;
  priority?: string;
  issueType: string;
  url: string;
}

// Navigation types
export type SettingsCategory = 'general' | 'appearance' | 'ide' | 'worktree' | 'github' | 'jira';

// Deep link types
export type DeepLinkRoute = 'create-worktree' | 'settings';

export interface DeepLinkParams {
  route: DeepLinkRoute;
  project?: string; // Project name (fuzzy match)
  issue?: string; // Issue number
  description?: string;
}

export interface ParsedDeepLink {
  valid: boolean;
  params?: DeepLinkParams;
  error?: string;
}
