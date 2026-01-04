import { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  GitBranch,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  RefreshCw,
  Folder,
  Terminal,
  GitBranchPlus,
  Pencil,
  ExternalLink,
  GitPullRequest,
  CircleDot,
  GitMerge,
} from 'lucide-react';
import { message } from '@tauri-apps/plugin-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as api from '@/lib/api';
import type { Project, Worktree, IDEPreset } from '@/types';
import type { PullRequestInfo, JiraIssueInfo } from '@/lib/api';

interface WorktreeListPageProps {
  onOpenSettings: () => void;
  onOpenProjectSettings: (project: Project) => void;
  onAddProject: () => void;
  onCreateWorktree: (project: Project) => void;
  onEditWorktree: (worktree: Worktree, repoPath: string) => void;
}

// Extended worktree with PR and Jira info
interface WorktreeWithIntegrations extends Worktree {
  prInfo?: PullRequestInfo;
  jiraInfo?: JiraIssueInfo;
}

interface ProjectWithIntegrations extends Omit<Project, 'worktrees'> {
  worktrees: WorktreeWithIntegrations[];
}

// Parse GitHub remote URL to get owner/repo
function parseGitHubRemote(repoPath: string): { owner: string; repo: string } | null {
  // Try to extract from path (e.g., /Users/x/projects/owner/repo)
  // For now, just use the last two path components as a fallback
  const parts = repoPath.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return {
      owner: parts[parts.length - 2],
      repo: parts[parts.length - 1],
    };
  }
  return null;
}

export function WorktreeListPage({
  onOpenSettings,
  onOpenProjectSettings,
  onAddProject,
  onCreateWorktree,
  onEditWorktree,
}: WorktreeListPageProps) {
  const [projects, setProjects] = useState<ProjectWithIntegrations[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<api.BackendAppSettings | null>(null);
  const [hasGitHub, setHasGitHub] = useState(false);
  const [hasJira, setHasJira] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsData, projectsData, githubConfig, jiraConfig] = await Promise.all([
        api.getSettings(),
        api.getProjects(),
        api.getGitHubConfig().catch(() => null),
        api.getJiraConfig().catch(() => null),
      ]);
      setSettings(settingsData);
      setHasGitHub(!!githubConfig);
      setHasJira(!!jiraConfig);

      // Load worktrees for each project
      const projectsWithWorktrees: ProjectWithIntegrations[] = await Promise.all(
        projectsData.map(async (p) => {
          try {
            const worktrees = await api.getWorktrees(p.repo_path);
            const remoteInfo = parseGitHubRemote(p.repo_path);

            // Load memos and integration data for each worktree
            const worktreesWithData: WorktreeWithIntegrations[] = await Promise.all(
              worktrees.map(async (w) => {
                const result: WorktreeWithIntegrations = {
                  path: w.path,
                  branch: w.branch,
                  isMain: w.is_main,
                };

                // Load memo
                try {
                  const memo = await api.getWorktreeMemo(w.path);
                  result.description = memo.description;
                  result.issueNumber = memo.issue_number;
                } catch {
                  // Ignore
                }

                // Load Jira info if configured and issue number exists
                if (jiraConfig && result.issueNumber) {
                  try {
                    const jiraInfo = await api.fetchJiraIssue(result.issueNumber);
                    if (jiraInfo) {
                      result.jiraInfo = jiraInfo;
                    }
                  } catch {
                    // Ignore
                  }
                }

                // Load PR info if GitHub configured
                if (githubConfig && remoteInfo && !w.is_main) {
                  try {
                    const prs = await api.fetchPullRequests(remoteInfo.owner, remoteInfo.repo, w.branch);
                    if (prs.length > 0) {
                      // Get the most recent/relevant PR
                      result.prInfo = prs[0];
                    }
                  } catch {
                    // Ignore
                  }
                }

                return result;
              })
            );

            return {
              name: p.name,
              repoPath: p.repo_path,
              defaultBaseBranch: p.default_base_branch,
              ide: p.ide?.preset as IDEPreset | undefined,
              worktrees: worktreesWithData,
            };
          } catch {
            return {
              name: p.name,
              repoPath: p.repo_path,
              defaultBaseBranch: p.default_base_branch,
              ide: p.ide?.preset as IDEPreset | undefined,
              worktrees: [],
            };
          }
        })
      );

      setProjects(projectsWithWorktrees);
      setExpandedProjects(new Set(projectsWithWorktrees.map((p) => p.name)));
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleProject = (name: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleOpenIde = async (path: string, projectIde?: string) => {
    // Use project IDE override if set, otherwise use global settings
    const preset = projectIde || settings?.ide?.preset || 'code';
    const customCommand = settings?.ide?.custom_command;

    try {
      await api.openIde(path, preset, customCommand);
    } catch (err) {
      console.error('Failed to open IDE:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      await message(
        `Failed to open IDE "${preset}".\n\nMake sure the IDE is installed and the command is available in your PATH.\n\nError: ${errorMessage}`,
        { title: 'IDE Error', kind: 'error' }
      );
    }
  };

  const handleOpenFinder = async (path: string) => {
    try {
      await api.openInFinder(path);
    } catch (err) {
      console.error('Failed to open Finder:', err);
    }
  };

  const handleOpenTerminal = async (path: string) => {
    try {
      await api.openTerminal(path);
    } catch (err) {
      console.error('Failed to open Terminal:', err);
    }
  };

  // Check if any worktree has data for optional columns
  const allWorktrees = projects.flatMap((p) => p.worktrees);
  const hasAnyDescription = allWorktrees.some((w) => w.description);
  const hasAnyGitHub = hasGitHub && allWorktrees.some((w) => w.prInfo);
  const hasAnyJira = hasJira && allWorktrees.some((w) => w.jiraInfo);

  return (
    <div className="h-full flex flex-col">
      {/* Titlebar drag area with actions */}
      <div data-tauri-drag-region className="titlebar">
        <div className="titlebar-spacer" />
        <span className="titlebar-title">Grovr</span>
        <div className="flex items-center gap-1 no-drag">
          <button className="icon-button-sm" onClick={loadData} title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="icon-button-sm" title="Add Project" onClick={onAddProject}>
            <Plus size={14} />
          </button>
          <button className="icon-button-sm" onClick={onOpenSettings} title="Settings">
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-2 pt-1 pb-20 space-y-0">
          {projects.length === 0 && !loading && (
            <div className="empty-state">
              <div className="empty-state-icon">📁</div>
              <h3 className="empty-state-title">No projects yet</h3>
              <p className="empty-state-description">
                Add your first project to start managing worktrees
              </p>
              <button className="btn-secondary" onClick={onAddProject}>
                <Plus size={14} />
                <span>Add Project</span>
              </button>
            </div>
          )}
          {projects.map((project) => (
            <ProjectCard
              key={project.name}
              project={project}
              expanded={expandedProjects.has(project.name)}
              onToggle={() => toggleProject(project.name)}
              onOpenProjectSettings={onOpenProjectSettings}
              onOpenIde={handleOpenIde}
              onOpenFinder={handleOpenFinder}
              onOpenTerminal={handleOpenTerminal}
              onCreateWorktree={() => onCreateWorktree(project)}
              onEditWorktree={onEditWorktree}
              showDescription={hasAnyDescription}
              showGitHub={hasAnyGitHub}
              showJira={hasAnyJira}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface ProjectCardProps {
  project: ProjectWithIntegrations;
  expanded: boolean;
  onToggle: () => void;
  onOpenProjectSettings: (project: Project) => void;
  onOpenIde: (path: string, projectIde?: string) => void;
  onOpenFinder: (path: string) => void;
  onOpenTerminal: (path: string) => void;
  onCreateWorktree: () => void;
  onEditWorktree: (worktree: Worktree, repoPath: string) => void;
  showDescription: boolean;
  showGitHub: boolean;
  showJira: boolean;
}

function ProjectCard({
  project,
  expanded,
  onToggle,
  onOpenProjectSettings,
  onOpenIde,
  onOpenFinder,
  onOpenTerminal,
  onCreateWorktree,
  onEditWorktree,
  showDescription,
  showGitHub,
  showJira,
}: ProjectCardProps) {
  return (
    <div className="project-section">
      {/* Project Header */}
      <div className="project-header">
        <button className="project-toggle" onClick={onToggle}>
          <span className="project-name">{project.name}</span>
          {expanded ? (
            <ChevronDown size={14} className="project-chevron" />
          ) : (
            <ChevronRight size={14} className="project-chevron" />
          )}
        </button>
        <div className="project-actions">
          <button
            className="project-action"
            title="New Worktree"
            onClick={(e) => {
              e.stopPropagation();
              onCreateWorktree();
            }}
          >
            <GitBranchPlus size={14} />
          </button>
          <button
            className="project-settings"
            title="Project Settings"
            onClick={(e) => {
              e.stopPropagation();
              onOpenProjectSettings(project);
            }}
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Worktree Table */}
      {expanded && (
        <div className="worktree-table">
          {project.worktrees.length === 0 ? (
            <div className="text-muted text-sm py-2 px-3">No worktrees found</div>
          ) : (
            project.worktrees.map((worktree) => (
              <WorktreeRow
                key={worktree.path}
                worktree={worktree}
                onOpenIde={(path) => onOpenIde(path, project.ide)}
                onOpenFinder={onOpenFinder}
                onOpenTerminal={onOpenTerminal}
                onEdit={() => onEditWorktree(worktree, project.repoPath)}
                showDescription={showDescription}
                showGitHub={showGitHub}
                showJira={showJira}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface WorktreeRowProps {
  worktree: WorktreeWithIntegrations;
  onOpenIde: (path: string) => void;
  onOpenFinder: (path: string) => void;
  onOpenTerminal: (path: string) => void;
  onEdit: () => void;
  showDescription: boolean;
  showGitHub: boolean;
  showJira: boolean;
}

function WorktreeRow({
  worktree,
  onOpenIde,
  onOpenFinder,
  onOpenTerminal,
  onEdit,
  showDescription,
  showGitHub,
  showJira,
}: WorktreeRowProps) {
  const [showActions, setShowActions] = useState(false);

  const handleRowClick = () => {
    if (!showActions) {
      onOpenIde(worktree.path);
    }
  };

  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActions(!showActions);
  };

  const getPRIcon = (pr: PullRequestInfo) => {
    if (pr.merged) return <GitMerge size={12} className="text-purple-500" />;
    if (pr.draft) return <GitPullRequest size={12} className="text-muted-foreground" />;
    if (pr.state === 'open') return <GitPullRequest size={12} className="text-green-500" />;
    return <GitPullRequest size={12} className="text-red-500" />;
  };

  const getPRLabel = (pr: PullRequestInfo) => {
    if (pr.merged) return 'Merged';
    if (pr.draft) return 'Draft';
    if (pr.state === 'open') return 'Open';
    return 'Closed';
  };

  const getJiraStatusColor = (category: string) => {
    switch (category) {
      case 'done':
        return 'text-green-500';
      case 'indeterminate':
        return 'text-blue-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div
      className="worktree-row"
      onClick={handleRowClick}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Branch */}
      <div className="worktree-col-branch">
        <GitBranch size={14} className="worktree-branch-icon" />
        <span className="worktree-branch-name">{worktree.branch}</span>
        {worktree.isMain && <span className="worktree-main-badge">main</span>}
      </div>

      {/* Description - only show if any worktree has description */}
      {showDescription && (
        <div className="worktree-col-description">
          <span className="worktree-description">
            {worktree.description || <span className="text-muted-light">—</span>}
          </span>
        </div>
      )}

      {/* GitHub Status - only show if any worktree has GitHub data */}
      {showGitHub && (
        <div className="worktree-col-github">
          {worktree.prInfo ? (
            <a
              href={worktree.prInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="integration-link"
              onClick={(e) => e.stopPropagation()}
            >
              {getPRIcon(worktree.prInfo)}
              <span className="integration-link-text">
                #{worktree.prInfo.number} {getPRLabel(worktree.prInfo)}
              </span>
              <ExternalLink size={10} className="integration-link-icon" />
            </a>
          ) : (
            <span className="text-muted-light">—</span>
          )}
        </div>
      )}

      {/* Jira Status - only show if any worktree has Jira data */}
      {showJira && (
        <div className="worktree-col-jira">
          {worktree.jiraInfo ? (
            <a
              href={worktree.jiraInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="integration-link"
              onClick={(e) => e.stopPropagation()}
            >
              <CircleDot size={12} className={getJiraStatusColor(worktree.jiraInfo.status_category)} />
              <span className="integration-link-text">
                {worktree.jiraInfo.key}
              </span>
              <ExternalLink size={10} className="integration-link-icon" />
            </a>
          ) : (
            <span className="text-muted-light">—</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="worktree-col-actions">
        <button className="worktree-more" title="More actions" onClick={handleMoreClick}>
          <MoreHorizontal size={14} />
        </button>
        {showActions && (
          <div className="worktree-actions-dropdown">
            <button
              className="worktree-dropdown-item"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
                setShowActions(false);
              }}
            >
              <Pencil size={14} />
              <span>Edit</span>
            </button>
            <button
              className="worktree-dropdown-item"
              onClick={(e) => {
                e.stopPropagation();
                onOpenFinder(worktree.path);
                setShowActions(false);
              }}
            >
              <Folder size={14} />
              <span>Open in Finder</span>
            </button>
            <button
              className="worktree-dropdown-item"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTerminal(worktree.path);
                setShowActions(false);
              }}
            >
              <Terminal size={14} />
              <span>Open Terminal</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
