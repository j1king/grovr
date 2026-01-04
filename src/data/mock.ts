import type { Project, PullRequestInfo, JiraIssue, GitHubConfig, JiraConfig } from '@/types';

export const mockProjects: Project[] = [
  {
    name: 'grovr-desktop',
    repoPath: '/Users/j1king/my/grovr-desktop',
    defaultBaseBranch: 'origin/main',
    worktrees: [
      {
        path: '/Users/j1king/my/grovr-desktop',
        branch: 'main',
        isMain: true,
      },
      {
        path: '/Users/j1king/my/grovr-desktop.worktrees/feature-settings',
        branch: 'feature/settings-page',
        isMain: false,
        description: 'Settings page implementation',
        issueNumber: 'GRV-42',
      },
      {
        path: '/Users/j1king/my/grovr-desktop.worktrees/fix-dark-mode',
        branch: 'fix/dark-mode-toggle',
        isMain: false,
        description: 'Fix dark mode not persisting',
        issueNumber: 'GRV-38',
      },
    ],
  },
  {
    name: 'api-server',
    repoPath: '/Users/j1king/projects/api-server',
    defaultBaseBranch: 'origin/develop',
    worktrees: [
      {
        path: '/Users/j1king/projects/api-server',
        branch: 'develop',
        isMain: true,
      },
      {
        path: '/Users/j1king/projects/api-server.worktrees/auth-refactor',
        branch: 'feature/auth-refactor',
        isMain: false,
        description: 'Refactor authentication module',
        issueNumber: 'API-156',
      },
      {
        path: '/Users/j1king/projects/api-server.worktrees/rate-limiting',
        branch: 'feature/rate-limiting',
        isMain: false,
        description: 'Add rate limiting middleware',
        issueNumber: 'API-201',
      },
      {
        path: '/Users/j1king/projects/api-server.worktrees/hotfix-memory',
        branch: 'hotfix/memory-leak',
        isMain: false,
        description: 'Fix memory leak in cache',
      },
    ],
  },
  {
    name: 'web-app',
    repoPath: '/Users/j1king/projects/web-app',
    worktrees: [
      {
        path: '/Users/j1king/projects/web-app',
        branch: 'main',
        isMain: true,
      },
      {
        path: '/Users/j1king/projects/web-app.worktrees/dashboard-v2',
        branch: 'feature/dashboard-v2',
        isMain: false,
        description: 'New dashboard design',
        issueNumber: 'WEB-89',
      },
    ],
  },
];

export const mockPRs: Record<string, PullRequestInfo | null> = {
  'feature/settings-page': {
    number: 42,
    title: 'feat: Add settings page',
    state: 'open',
    merged: false,
    draft: false,
    url: 'https://github.com/user/grovr-desktop/pull/42',
    reviewDecision: 'APPROVED',
    checksStatus: 'success',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-16T14:30:00Z',
  },
  'fix/dark-mode-toggle': {
    number: 38,
    title: 'fix: Dark mode not persisting',
    state: 'open',
    merged: false,
    draft: true,
    url: 'https://github.com/user/grovr-desktop/pull/38',
    reviewDecision: null,
    checksStatus: 'pending',
    createdAt: '2024-01-14T09:00:00Z',
    updatedAt: '2024-01-14T09:00:00Z',
  },
  'feature/auth-refactor': {
    number: 156,
    title: 'feat: Refactor authentication module',
    state: 'open',
    merged: false,
    draft: false,
    url: 'https://github.com/user/api-server/pull/156',
    reviewDecision: 'CHANGES_REQUESTED',
    checksStatus: 'success',
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-15T11:00:00Z',
  },
  'feature/rate-limiting': {
    number: 201,
    title: 'feat: Add rate limiting',
    state: 'closed',
    merged: true,
    draft: false,
    url: 'https://github.com/user/api-server/pull/201',
    reviewDecision: 'APPROVED',
    checksStatus: 'success',
    createdAt: '2024-01-08T10:00:00Z',
    updatedAt: '2024-01-12T16:00:00Z',
  },
  'feature/dashboard-v2': {
    number: 89,
    title: 'feat: New dashboard design',
    state: 'open',
    merged: false,
    draft: false,
    url: 'https://github.com/user/web-app/pull/89',
    reviewDecision: null,
    checksStatus: 'failure',
    createdAt: '2024-01-13T14:00:00Z',
    updatedAt: '2024-01-16T09:00:00Z',
  },
};

export const mockJiraIssues: Record<string, JiraIssue | null> = {
  'GRV-42': {
    key: 'GRV-42',
    summary: 'Implement settings page with categories',
    status: 'In Progress',
    statusCategory: 'inprogress',
    assignee: 'John Kim',
    priority: 'High',
    issueType: 'Story',
    url: 'https://company.atlassian.net/browse/GRV-42',
  },
  'GRV-38': {
    key: 'GRV-38',
    summary: 'Dark mode toggle not working',
    status: 'To Do',
    statusCategory: 'todo',
    assignee: 'John Kim',
    priority: 'Medium',
    issueType: 'Bug',
    url: 'https://company.atlassian.net/browse/GRV-38',
  },
  'API-156': {
    key: 'API-156',
    summary: 'Refactor auth module for better security',
    status: 'In Review',
    statusCategory: 'inprogress',
    assignee: 'Jane Doe',
    priority: 'High',
    issueType: 'Task',
    url: 'https://company.atlassian.net/browse/API-156',
  },
  'API-201': {
    key: 'API-201',
    summary: 'Add rate limiting to API endpoints',
    status: 'Done',
    statusCategory: 'done',
    assignee: 'John Kim',
    priority: 'Medium',
    issueType: 'Story',
    url: 'https://company.atlassian.net/browse/API-201',
  },
  'WEB-89': {
    key: 'WEB-89',
    summary: 'Redesign dashboard with new components',
    status: 'In Progress',
    statusCategory: 'inprogress',
    assignee: 'John Kim',
    priority: 'High',
    issueType: 'Story',
    url: 'https://company.atlassian.net/browse/WEB-89',
  },
};

export const mockGitHubConfigs: GitHubConfig[] = [
  {
    id: '1',
    name: 'Personal',
    type: 'community',
    token: 'ghp_xxxx...xxxx',
  },
  {
    id: '2',
    name: 'Work',
    type: 'enterprise',
    host: 'github.company.com',
    token: 'ghp_yyyy...yyyy',
  },
];

export const mockJiraConfigs: JiraConfig[] = [
  {
    id: '1',
    name: 'Company Jira',
    host: 'company.atlassian.net',
    email: 'john@company.com',
    apiToken: 'ATATT3x...xxx',
    views: [
      { id: '1', name: 'My Issues', jql: 'assignee = currentUser() ORDER BY updated DESC' },
      { id: '2', name: 'Sprint Issues', jql: 'sprint in openSprints() ORDER BY priority DESC' },
    ],
  },
];
