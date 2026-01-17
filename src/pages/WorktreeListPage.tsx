import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
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
  Trash2,
  Search,
  X,
} from 'lucide-react';
import { message } from '@tauri-apps/plugin-dialog';
import { openUrl } from '@tauri-apps/plugin-opener';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { AlertModal } from '@/components/ui/alert-modal';
import { getIDEInfo } from '@/lib/ide-config';
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

  // IDE confirmation modal state
  const [ideModalOpen, setIdeModalOpen] = useState(false);
  const [ideModalData, setIdeModalData] = useState<{
    path: string;
    preset: IDEPreset;
    customCommand?: string;
    folderName: string;
  } | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  // Delete worktree modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalData, setDeleteModalData] = useState<{
    worktree: Worktree;
    repoPath: string;
  } | null>(null);
  const [forceDeleteModalOpen, setForceDeleteModalOpen] = useState(false);
  const [forceDeleting, setForceDeleting] = useState(false);
  const [forceDeleteError, setForceDeleteError] = useState('');
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');

  // Keyboard navigation and search state
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const handleOpenIdeRef = useRef<(path: string, projectIde?: string) => void>(() => {});
  const selectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-clear selection after timeout (only when not in search mode)
  useEffect(() => {
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
    }

    if (selectedPath && !searchActive) {
      selectionTimeoutRef.current = setTimeout(() => {
        setSelectedPath(null);
      }, 3000);
    }

    return () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, [selectedPath, searchActive]);

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

  // Calculate visible worktrees for keyboard navigation
  const visibleWorktrees = useMemo(() => {
    const result: { path: string; projectIde?: string }[] = [];
    const query = searchQuery.toLowerCase();

    for (const project of projects) {
      if (!expandedProjects.has(project.repoPath)) continue;

      const sortedWorktrees = [...project.worktrees].sort((a, b) => {
        if (a.isMain && !b.isMain) return -1;
        if (!a.isMain && b.isMain) return 1;
        return a.branch.localeCompare(b.branch);
      });

      for (const worktree of sortedWorktrees) {
        // Filter by search query
        if (query) {
          const branchMatch = worktree.branch.toLowerCase().includes(query);
          const descMatch = worktree.description?.toLowerCase().includes(query);
          if (!branchMatch && !descMatch) continue;
        }
        result.push({ path: worktree.path, projectIde: project.ide });
      }
    }

    return result;
  }, [projects, expandedProjects, searchQuery]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if modal is open
    if (ideModalOpen || deleteModalOpen || forceDeleteModalOpen || errorModalOpen) return;

    const target = e.target as HTMLElement;
    const isSearchInput = target === searchInputRef.current;
    const key = e.key;

    // Arrow navigation (works even when search input is focused)
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      e.preventDefault();
      if (visibleWorktrees.length === 0) return;

      const currentIndex = selectedPath
        ? visibleWorktrees.findIndex((w) => w.path === selectedPath)
        : -1;

      let nextIndex: number;
      if (key === 'ArrowDown') {
        nextIndex = currentIndex < visibleWorktrees.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : visibleWorktrees.length - 1;
      }

      setSelectedPath(visibleWorktrees[nextIndex].path);

      // Scroll into view
      setTimeout(() => {
        const escapedPath = globalThis.CSS.escape(visibleWorktrees[nextIndex].path);
        const selectedEl = document.querySelector(`[data-worktree-path="${escapedPath}"]`);
        selectedEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 0);
      return;
    }

    // Enter to open IDE
    if (key === 'Enter' && selectedPath) {
      e.preventDefault();
      const worktree = visibleWorktrees.find((w) => w.path === selectedPath);
      if (worktree) {
        handleOpenIdeRef.current(worktree.path, worktree.projectIde);
      }
      return;
    }

    // Escape to clear search
    if (key === 'Escape') {
      if (searchActive || searchQuery) {
        e.preventDefault();
        setSearchQuery('');
        setSearchActive(false);
        searchInputRef.current?.blur();
      }
      return;
    }

    // Skip the rest if focused on other inputs
    if (!isSearchInput && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

    // Cmd+F to activate search
    if (key === 'f' && e.metaKey) {
      e.preventDefault();
      setSearchActive(true);
      setTimeout(() => searchInputRef.current?.focus(), 0);
      return;
    }

    // Printable characters to search (only when not in search input)
    if (!isSearchInput && key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setSearchActive(true);
      setSearchQuery((prev) => prev + key);
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [visibleWorktrees, selectedPath, searchQuery, searchActive, ideModalOpen, deleteModalOpen, forceDeleteModalOpen, errorModalOpen]);

  // Attach keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset selection if it's no longer visible
  useEffect(() => {
    if (selectedPath && !visibleWorktrees.find((w) => w.path === selectedPath)) {
      setSelectedPath(visibleWorktrees[0]?.path || null);
    }
  }, [visibleWorktrees, selectedPath]);

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
        onExpandedProjectsChange(new Set(projectsWithWorktrees.map((p) => p.repoPath)));
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

  const toggleProject = (repoPath: string) => {
    const next = new Set(expandedProjects);
    if (next.has(repoPath)) {
      next.delete(repoPath);
    } else {
      next.add(repoPath);
    }
    onExpandedProjectsChange(next);
  };

  const executeOpenIde = useCallback(async (path: string, preset: IDEPreset, customCommand?: string) => {
    try {
      await api.openIde(path, preset, customCommand);
    } catch (err) {
      console.error('Failed to open IDE:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      const ideInfo = getIDEInfo(preset);
      await message(
        `Failed to open ${ideInfo.name}.\n\nMake sure the IDE is installed and the command is available in your PATH.\n\nError: ${errorMessage}`,
        { title: 'IDE Error', kind: 'error' }
      );
    }
  }, []);

  const handleOpenIde = useCallback(async (path: string, projectIde?: string) => {
    // Use project IDE override if set, otherwise use global settings
    const preset = (projectIde || settings?.ide?.preset || 'code') as IDEPreset;
    const customCommand = settings?.ide?.custom_command;
    const skipConfirm = settings?.skip_open_ide_confirm ?? false;

    // Show confirmation modal unless skip is enabled
    if (!skipConfirm) {
      const folderName = path.split('/').pop() || path;
      setIdeModalData({ path, preset, customCommand, folderName });
      setDontAskAgain(false);
      setIdeModalOpen(true);
      return;
    }

    // Direct open if skip is enabled
    await executeOpenIde(path, preset, customCommand);
  }, [settings, executeOpenIde]);

  // Keep ref updated for keyboard handler
  handleOpenIdeRef.current = handleOpenIde;

  const handleIdeModalConfirm = async () => {
    if (!ideModalData) return;

    // Capture data before closing modal
    const { path, preset, customCommand } = ideModalData;

    // Save "don't ask again" preference if checked
    if (dontAskAgain) {
      try {
        await api.setSkipOpenIdeConfirm(true);
        setSettings((prev) =>
          prev ? { ...prev, skip_open_ide_confirm: true } : prev
        );
      } catch (err) {
        console.error('Failed to save skip confirm preference:', err);
      }
    }

    // Close modal and clear data together to prevent empty modal flash
    setIdeModalOpen(false);
    setIdeModalData(null);

    await executeOpenIde(path, preset, customCommand);
  };

  const handleIdeModalCancel = () => {
    setIdeModalOpen(false);
    setIdeModalData(null);
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

  const handleDeleteWorktree = (worktree: Worktree, repoPath: string) => {
    setDeleteModalData({ worktree, repoPath });
    setDeleteModalOpen(true);
  };

  const executeDeleteWorktree = async (force: boolean = false) => {
    if (!deleteModalData) return;
    const { worktree, repoPath } = deleteModalData;

    // Force React to render loading state before starting operation
    flushSync(() => {
      if (force) {
        setForceDeleting(true);
      } else {
        setDeleting(true);
      }
    });

    try {
      await api.removeWorktree(repoPath, worktree.path, force);
      setDeleteModalOpen(false);
      setForceDeleteModalOpen(false);
      setDeleteModalData(null);
      loadData();
    } catch (err) {
      console.error('Failed to delete worktree:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (!force) {
        // If normal delete fails, offer force delete
        setDeleteModalOpen(false);
        setForceDeleteError(errorMessage);
        setForceDeleteModalOpen(true);
      } else {
        // Force delete also failed
        setForceDeleteModalOpen(false);
        setErrorModalMessage(`Failed to force delete worktree: ${errorMessage}`);
        setErrorModalOpen(true);
        setDeleteModalData(null);
      }
    } finally {
      setDeleting(false);
      setForceDeleting(false);
    }
  };

  // Check if any worktree has data for optional columns
  const allWorktrees = projects.flatMap((p) => p.worktrees);
  const hasAnyDescription = allWorktrees.some((w) => w.description);
  // Only show integration columns if there's actual fetched data
  const hasAnyGitHub = hasGitHub && allWorktrees.some((w) => w.prInfo);
  const hasAnyJira = hasJira && allWorktrees.some((w) => w.jiraInfo || w.issueNumber);

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

      {/* Search Bar */}
      {searchActive && (
        <div className="search-bar">
          <Search size={12} className="search-bar-icon" />
          <input
            ref={searchInputRef}
            type="text"
            className="search-bar-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type to search..."
            autoFocus
          />
          <button
            className="search-bar-clear"
            onClick={() => {
              setSearchQuery('');
              setSearchActive(false);
            }}
            title="Clear search (Esc)"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="pl-2 pr-3 pt-1 pb-2 space-y-0">
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
                  expanded={expandedProjects.has(project.repoPath)}
                  onToggle={() => toggleProject(project.repoPath)}
                  onOpenProjectSettings={onOpenProjectSettings}
                  onOpenIde={handleOpenIde}
                  onOpenFinder={handleOpenFinder}
                  onOpenTerminal={handleOpenTerminal}
                  onCreateWorktree={() => onCreateWorktree(project)}
                  onEditWorktree={onEditWorktree}
                  onDeleteWorktree={handleDeleteWorktree}
                  showDescription={hasAnyDescription}
                  showGitHub={hasAnyGitHub}
                  showJira={hasAnyJira}
                  jiraHost={jiraHost}
                  selectedPath={selectedPath}
                  searchQuery={searchQuery}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </ScrollArea>

      {/* IDE Confirmation Modal */}
      <Modal open={ideModalOpen} onOpenChange={setIdeModalOpen}>
        <ModalContent>
          {ideModalData && (() => {
            const ideInfo = getIDEInfo(ideModalData.preset);
            return (
              <>
                <div className="modal-icon-container">
                  <div className="modal-icon">
                    <img src={ideInfo.icon} alt={ideInfo.name} />
                  </div>
                </div>
                <ModalHeader>
                  <ModalTitle>Open in {ideInfo.name}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                  <ModalDescription>
                    Open "<span className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>{ideModalData.folderName}</span>" in {ideInfo.name}?
                  </ModalDescription>
                  <div className="modal-checkbox-wrapper">
                    <input
                      type="checkbox"
                      id="dont-ask-again"
                      className="modal-checkbox"
                      checked={dontAskAgain}
                      onChange={(e) => setDontAskAgain(e.target.checked)}
                    />
                    <label htmlFor="dont-ask-again" className="modal-checkbox-label">
                      Don't ask again
                    </label>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button variant="outline" size="sm" onClick={handleIdeModalCancel}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleIdeModalConfirm} autoFocus>
                    Open
                  </Button>
                </ModalFooter>
              </>
            );
          })()}
        </ModalContent>
      </Modal>

      {/* Delete Worktree Confirmation Modal */}
      <ConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Worktree"
        description={deleteModalData ? `Are you sure you want to delete the worktree "${deleteModalData.worktree.branch}"?\n\nThis will remove the worktree directory and its contents.` : ''}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => executeDeleteWorktree(false)}
        onCancel={() => setDeleteModalData(null)}
        loading={deleting}
        loadingLabel="Deleting..."
      />

      {/* Force Delete Confirmation Modal */}
      <ConfirmModal
        open={forceDeleteModalOpen}
        onOpenChange={setForceDeleteModalOpen}
        title="Force Delete Worktree"
        description={`The worktree could not be deleted normally:\n\n${forceDeleteError}\n\nDo you want to force delete it? This cannot be undone.`}
        confirmLabel="Force Delete"
        variant="destructive"
        onConfirm={() => executeDeleteWorktree(true)}
        onCancel={() => {
          setForceDeleteModalOpen(false);
          setDeleteModalData(null);
        }}
        loading={forceDeleting}
        loadingLabel="Deleting..."
      />

      {/* Error Alert Modal */}
      <AlertModal
        open={errorModalOpen}
        onOpenChange={setErrorModalOpen}
        title="Error"
        description={errorModalMessage}
        variant="error"
      />
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
  onDeleteWorktree: (worktree: Worktree, repoPath: string) => void;
  showDescription: boolean;
  showGitHub: boolean;
  showJira: boolean;
  selectedPath: string | null;
  searchQuery: string;
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
  onDeleteWorktree,
  showDescription,
  showGitHub,
  showJira,
  jiraHost,
  selectedPath,
  searchQuery,
  dragHandleProps,
}: ProjectCardInternalProps) {
  // Filter worktrees by search query
  const filteredWorktrees = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const sorted = [...project.worktrees].sort((a, b) => {
      if (a.isMain && !b.isMain) return -1;
      if (!a.isMain && b.isMain) return 1;
      return a.branch.localeCompare(b.branch);
    });

    if (!query) return sorted;

    return sorted.filter((w) => {
      const branchMatch = w.branch.toLowerCase().includes(query);
      const descMatch = w.description?.toLowerCase().includes(query);
      return branchMatch || descMatch;
    });
  }, [project.worktrees, searchQuery]);
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
          {filteredWorktrees.length === 0 ? (
            <div className="text-muted text-sm py-2 px-3">
              {project.worktrees.length === 0 ? 'No worktrees found' : 'No matching worktrees'}
            </div>
          ) : (
            filteredWorktrees.map((worktree) => (
              <WorktreeRow
                key={worktree.path}
                worktree={worktree}
                onOpenIde={(path) => onOpenIde(path, project.ide)}
                onOpenFinder={onOpenFinder}
                onOpenTerminal={onOpenTerminal}
                onEdit={() => onEditWorktree(worktree, project.repoPath)}
                onDelete={() => onDeleteWorktree(worktree, project.repoPath)}
                showDescription={showDescription}
                showGitHub={showGitHub}
                showJira={showJira}
                jiraHost={jiraHost}
                isSelected={selectedPath === worktree.path}
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
  onDelete: () => void;
  showDescription: boolean;
  showGitHub: boolean;
  showJira: boolean;
  jiraHost: string | null;
  isSelected: boolean;
}

function WorktreeRow({
  worktree,
  onOpenIde,
  onOpenFinder,
  onOpenTerminal,
  onEdit,
  onDelete,
  showDescription,
  showGitHub,
  showJira,
  jiraHost,
  isSelected,
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
      className={`worktree-row ${isSelected ? 'worktree-row-selected' : ''}`}
      data-worktree-path={worktree.path}
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
            {!worktree.isMain && (
              <>
                <div className="worktree-dropdown-divider" />
                <button
                  className="worktree-dropdown-item worktree-dropdown-item-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActions(false);
                    onDelete();
                  }}
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
