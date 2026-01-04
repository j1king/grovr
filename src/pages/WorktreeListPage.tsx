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
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as api from '@/lib/api';
import type { Project, Worktree } from '@/types';

interface WorktreeListPageProps {
  onOpenSettings: () => void;
  onOpenProjectSettings: (project: Project) => void;
}

export function WorktreeListPage({ onOpenSettings, onOpenProjectSettings }: WorktreeListPageProps) {
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
            return {
              name: p.name,
              repoPath: p.repo_path,
              defaultBaseBranch: p.default_base_branch,
              emoji: p.emoji,
              worktrees: worktrees.map((w) => ({
                path: w.path,
                branch: w.branch,
                isMain: w.is_main,
              })),
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
          <button className="icon-button-sm" title="Add Project">
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
              <button className="btn-secondary" onClick={onOpenSettings}>
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
}

function ProjectCard({
  project,
  expanded,
  onToggle,
  onOpenProjectSettings,
  onOpenIde,
  onOpenFinder,
  onOpenTerminal,
}: ProjectCardProps) {
  return (
    <div className="project-section">
      {/* Project Header */}
      <div className="project-header">
        <button className="project-toggle" onClick={onToggle}>
          <span className="project-emoji">{project.emoji || '📁'}</span>
          <span className="project-name">{project.name}</span>
          {expanded ? (
            <ChevronDown size={14} className="project-chevron" />
          ) : (
            <ChevronRight size={14} className="project-chevron" />
          )}
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
}

function WorktreeRow({ worktree, onOpenIde, onOpenFinder, onOpenTerminal }: WorktreeRowProps) {
  const [showActions, setShowActions] = useState(false);

  const handleClick = () => {
    onOpenIde(worktree.path);
  };

  return (
    <div
      className="worktree-row"
      onClick={handleClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Branch */}
      <div className="worktree-col-branch">
        <GitBranch size={14} className="worktree-branch-icon" />
        <span className="worktree-branch-name">{worktree.branch}</span>
        {worktree.isMain && <span className="worktree-main-badge">main</span>}
      </div>

      {/* Description */}
      <div className="worktree-col-description">
        <span className="worktree-description">
          {worktree.description || <span className="text-muted-light">—</span>}
        </span>
      </div>

      {/* GitHub Status - placeholder for Phase 5 */}
      <div className="worktree-col-github">
        <span className="text-muted-light">—</span>
      </div>

      {/* Jira Status - placeholder for Phase 6 */}
      <div className="worktree-col-jira">
        <span className="text-muted-light">—</span>
      </div>

      {/* Actions */}
      <div className="worktree-col-actions">
        {showActions ? (
          <div className="flex gap-1">
            <button
              className="worktree-action"
              title="Open in Finder"
              onClick={(e) => {
                e.stopPropagation();
                onOpenFinder(worktree.path);
              }}
            >
              <Folder size={14} />
            </button>
            <button
              className="worktree-action"
              title="Open Terminal"
              onClick={(e) => {
                e.stopPropagation();
                onOpenTerminal(worktree.path);
              }}
            >
              <Terminal size={14} />
            </button>
            <button className="worktree-action" title="More actions">
              <MoreHorizontal size={14} />
            </button>
          </div>
        ) : (
          <button className="worktree-more" title="More actions">
            <MoreHorizontal size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

