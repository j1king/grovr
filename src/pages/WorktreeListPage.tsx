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
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as api from '@/lib/api';
import type { Project, Worktree } from '@/types';

interface WorktreeListPageProps {
  onOpenSettings: () => void;
  onOpenProjectSettings: (project: Project) => void;
  onAddProject: () => void;
  onCreateWorktree: (project: Project) => void;
  onEditWorktree: (worktree: Worktree, repoPath: string) => void;
}

export function WorktreeListPage({
  onOpenSettings,
  onOpenProjectSettings,
  onAddProject,
  onCreateWorktree,
  onEditWorktree,
}: WorktreeListPageProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<api.BackendAppSettings | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsData, projectsData] = await Promise.all([
        api.getSettings(),
        api.getProjects(),
      ]);
      setSettings(settingsData);

      // Load worktrees for each project
      const projectsWithWorktrees: Project[] = await Promise.all(
        projectsData.map(async (p) => {
          try {
            const worktrees = await api.getWorktrees(p.repo_path);
            // Load memos for each worktree
            const worktreesWithMemos = await Promise.all(
              worktrees.map(async (w) => {
                try {
                  const memo = await api.getWorktreeMemo(w.path);
                  return {
                    path: w.path,
                    branch: w.branch,
                    isMain: w.is_main,
                    description: memo.description,
                    issueNumber: memo.issue_number,
                  };
                } catch {
                  return {
                    path: w.path,
                    branch: w.branch,
                    isMain: w.is_main,
                  };
                }
              })
            );
            return {
              name: p.name,
              repoPath: p.repo_path,
              defaultBaseBranch: p.default_base_branch,
              emoji: p.emoji,
              worktrees: worktreesWithMemos,
            };
          } catch {
            return {
              name: p.name,
              repoPath: p.repo_path,
              defaultBaseBranch: p.default_base_branch,
              emoji: p.emoji,
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

  const handleOpenIde = async (path: string) => {
    try {
      const preset = settings?.ide?.preset || 'code';
      const customCommand = settings?.ide?.custom_command;
      await api.openIde(path, preset, customCommand);
    } catch (err) {
      console.error('Failed to open IDE:', err);
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
  // For now, GitHub and Jira are placeholders
  const hasAnyGitHub = false;
  const hasAnyJira = false;

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
        <div className="px-2 pt-1 space-y-0">
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
  project: Project;
  expanded: boolean;
  onToggle: () => void;
  onOpenProjectSettings: (project: Project) => void;
  onOpenIde: (path: string) => void;
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
                onOpenIde={onOpenIde}
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
  worktree: Worktree;
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
          <span className="text-muted-light">—</span>
        </div>
      )}

      {/* Jira Status - only show if any worktree has Jira data */}
      {showJira && (
        <div className="worktree-col-jira">
          <span className="text-muted-light">—</span>
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
