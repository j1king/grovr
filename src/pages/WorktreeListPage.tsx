import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  GripVertical,
} from 'lucide-react';
import { message, ask } from '@tauri-apps/plugin-dialog';
import { openUrl } from '@tauri-apps/plugin-opener';
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
  expandedProjects: Set<string>;
  onExpandedProjectsChange: (expanded: Set<string>) => void;
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
  expandedProjects,
  onExpandedProjectsChange,
}: WorktreeListPageProps) {
  const [projects, setProjects] = useState<ProjectWithIntegrations[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<api.BackendAppSettings | null>(null);
  const [hasGitHub, setHasGitHub] = useState(false);
  const [hasJira, setHasJira] = useState(false);
  const [jiraHost, setJiraHost] = useState<string | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = projects.findIndex((p) => p.repoPath === active.id);
      const newIndex = projects.findIndex((p) => p.repoPath === over.id);

      const newProjects = arrayMove(projects, oldIndex, newIndex);
      setProjects(newProjects);

      // Save new order to backend
      try {
        await api.reorderProjects(newProjects.map((p) => p.repoPath));
      } catch (err) {
        console.error('Failed to save project order:', err);
        // Revert on error
        setProjects(projects);
      }
    }
  };

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
      // Check if integrations are configured (by metadata presence, not token)
      setHasGitHub(!!githubConfig?.id);
      setHasJira(!!jiraConfig?.host);
      setJiraHost(jiraConfig?.host || null);

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
                if (jiraConfig?.host && result.issueNumber) {
                  console.log('[Jira Debug] Fetching issue:', result.issueNumber, 'host:', jiraConfig.host, 'email:', jiraConfig.email);
                  try {
                    const jiraInfo = await api.fetchJiraIssue(result.issueNumber);
                    console.log('[Jira Debug] Result for', result.issueNumber, ':', jiraInfo);
                    if (jiraInfo) {
                      result.jiraInfo = jiraInfo;
                    }
                  } catch (err) {
                    console.error('[Jira Debug] Failed to fetch Jira issue:', result.issueNumber, err);
                  }
                } else {
                  console.log('[Jira Debug] Skipping fetch - host:', jiraConfig?.host, 'issueNumber:', result.issueNumber);
                }

                // Load PR info if GitHub configured
                if (githubConfig?.id && remoteInfo && !w.is_main) {
                  try {
                    const prs = await api.fetchPullRequests(remoteInfo.owner, remoteInfo.repo, w.branch);
                    if (prs.length > 0) {
                      // Get the most recent/relevant PR
                      result.prInfo = prs[0];
                    }
                  } catch (err) {
                    console.error('Failed to fetch PRs:', w.branch, err);
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
      // Only auto-expand all if no expansion state exists
      if (expandedProjects.size === 0) {
        onExpandedProjectsChange(new Set(projectsWithWorktrees.map((p) => p.name)));
      }
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
    const next = new Set(expandedProjects);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    onExpandedProjectsChange(next);
  };

  const handleOpenIde = async (path: string, projectIde?: string) => {
    // Use project IDE override if set, otherwise use global settings
    const preset = projectIde || settings?.ide?.preset || 'code';
    const customCommand = settings?.ide?.custom_command;
    const skipConfirm = settings?.skip_open_ide_confirm ?? false;

    // Show confirmation dialog unless skip is enabled
    if (!skipConfirm) {
      const folderName = path.split('/').pop() || path;
      const confirmed = await ask(`Open "${folderName}" in ${preset}?`, {
        title: 'Open IDE',
        kind: 'info',
        okLabel: 'Open',
        cancelLabel: 'Cancel',
      });
      if (!confirmed) return;
    }

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
  // Show integration columns if connected (even if no worktree has data yet)
  const hasAnyGitHub = hasGitHub;
  const hasAnyJira = hasJira;

  return (
    <div className="h-full flex flex-col">
      {/* Titlebar drag area with actions */}
      <div data-tauri-drag-region className="titlebar">
        <div className="titlebar-spacer" />
        <span data-tauri-drag-region className="titlebar-title">
          Grovr{import.meta.env.VITE_PREVIEW_WORKTREE && ` (${import.meta.env.VITE_PREVIEW_WORKTREE})`}
        </span>
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
        <div className="px-2 pt-1 pb-2 space-y-0">
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={projects.map((p) => p.repoPath)}
              strategy={verticalListSortingStrategy}
            >
              {projects.map((project) => (
                <SortableProjectCard
                  key={project.repoPath}
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
                  jiraHost={jiraHost}
                />
              ))}
            </SortableContext>
          </DndContext>
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
  jiraHost: string | null;
  onOpenFinder: (path: string) => void;
  onOpenTerminal: (path: string) => void;
  onCreateWorktree: () => void;
  onEditWorktree: (worktree: Worktree, repoPath: string) => void;
  showDescription: boolean;
  showGitHub: boolean;
  showJira: boolean;
}

function SortableProjectCard(props: ProjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.project.repoPath });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ProjectCard {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

interface ProjectCardInternalProps extends ProjectCardProps {
  dragHandleProps?: Record<string, unknown>;
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
  jiraHost,
  dragHandleProps,
}: ProjectCardInternalProps) {
  return (
    <div className="project-section">
      {/* Project Header */}
      <div className="project-header">
        <button
          className="project-drag-handle"
          title="Drag to reorder"
          {...dragHandleProps}
        >
          <GripVertical size={14} />
        </button>
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
        <div
          className="worktree-table"
          style={{
            gridTemplateColumns: [
              'auto',
              showDescription ? 'minmax(0, 1fr)' : null,
              showGitHub ? '100px' : null,
              showJira ? '100px' : null,
              '28px',
            ].filter(Boolean).join(' '),
          }}
        >
          {project.worktrees.length === 0 ? (
            <div className="text-muted text-sm py-2 px-3">No worktrees found</div>
          ) : (
            [...project.worktrees]
              .sort((a, b) => {
                // Main branch always first
                if (a.isMain && !b.isMain) return -1;
                if (!a.isMain && b.isMain) return 1;
                // Then alphabetically
                return a.branch.localeCompare(b.branch);
              })
              .map((worktree) => (
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
                  jiraHost={jiraHost}
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
  jiraHost: string | null;
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
  jiraHost,
}: WorktreeRowProps) {
  const [showActions, setShowActions] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
  }>({ left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showActions) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setShowActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActions]);

  const handleRowClick = () => {
    if (!showActions) {
      onOpenIde(worktree.path);
    }
  };

  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showActions && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 110;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < dropdownHeight + 10;

      if (openUpward) {
        // Use bottom positioning for upward opening
        setDropdownPos({
          bottom: window.innerHeight - rect.top + 2,
          left: rect.right - 160,
        });
      } else {
        setDropdownPos({
          top: rect.bottom + 2,
          left: rect.right - 160,
        });
      }
    }
    setShowActions(!showActions);
  };

  const getPRStatusClass = (pr: PullRequestInfo) => {
    if (pr.merged) return 'status-merged';
    if (pr.draft) return 'status-draft';
    if (pr.state === 'open') return 'status-open';
    return 'status-closed';
  };

  const getPRIcon = (pr: PullRequestInfo) => {
    if (pr.merged) return <GitMerge size={10} className="badge-icon" />;
    return <GitPullRequest size={10} className="badge-icon" />;
  };

  const getJiraStatusClass = (category: string) => {
    switch (category) {
      case 'done':
        return 'status-done';
      case 'indeterminate':
        return 'status-in-progress';
      default:
        return 'status-todo';
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
            {worktree.description}
          </span>
        </div>
      )}

      {/* GitHub Status - badge style */}
      {showGitHub && (
        <div className="worktree-col-github">
          {worktree.prInfo ? (
            <button
              className={`integration-badge-link ${getPRStatusClass(worktree.prInfo)}`}
              onClick={(e) => {
                e.stopPropagation();
                openUrl(worktree.prInfo!.url);
              }}
            >
              {getPRIcon(worktree.prInfo)}
              <span className="badge-text">#{worktree.prInfo.number}</span>
              <ExternalLink size={8} className="badge-external" />
            </button>
          ) : null}
        </div>
      )}

      {/* Jira Status - badge style */}
      {showJira && (
        <div className="worktree-col-jira">
          {worktree.issueNumber && jiraHost ? (
            <button
              className={`integration-badge-link ${worktree.jiraInfo ? getJiraStatusClass(worktree.jiraInfo.status_category) : 'status-link-only'}`}
              onClick={(e) => {
                e.stopPropagation();
                const url = worktree.jiraInfo?.url || `https://${jiraHost}/browse/${worktree.issueNumber}`;
                openUrl(url);
              }}
            >
              <CircleDot size={10} className="badge-icon" />
              <span className="badge-text">
                {worktree.jiraInfo?.key || worktree.issueNumber}
              </span>
              <ExternalLink size={8} className="badge-external" />
            </button>
          ) : null}
        </div>
      )}

      {/* Actions */}
      <div className="worktree-col-actions">
        <button
          ref={buttonRef}
          className="worktree-more"
          title="More actions"
          onClick={handleMoreClick}
        >
          <MoreHorizontal size={14} />
        </button>
        {showActions && createPortal(
          <div
            ref={dropdownRef}
            className="worktree-actions-dropdown-portal"
            style={{
              top: dropdownPos.top,
              bottom: dropdownPos.bottom,
              left: dropdownPos.left,
            }}
          >
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
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
