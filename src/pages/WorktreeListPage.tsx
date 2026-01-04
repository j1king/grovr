import { useState } from 'react';
import {
  Settings,
  Plus,
  GitBranch,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Github,
  Clock,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Circle,
  MoreHorizontal,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { mockProjects, mockPRs, mockJiraIssues } from '@/data/mock';
import type { Project, Worktree, PullRequestInfo, JiraIssue } from '@/types';

interface WorktreeListPageProps {
  onOpenSettings: () => void;
  onOpenProjectSettings: (project: Project) => void;
}

export function WorktreeListPage({ onOpenSettings, onOpenProjectSettings }: WorktreeListPageProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(mockProjects.map((p) => p.name))
  );

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

  return (
    <div className="h-full flex flex-col">
      {/* Titlebar drag area with actions */}
      <div data-tauri-drag-region className="titlebar">
        <div className="titlebar-spacer" />
        <div className="flex items-center gap-1 no-drag">
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
          {mockProjects.map((project) => (
            <ProjectCard
              key={project.name}
              project={project}
              expanded={expandedProjects.has(project.name)}
              onToggle={() => toggleProject(project.name)}
              onOpenProjectSettings={onOpenProjectSettings}
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
}

function ProjectCard({ project, expanded, onToggle, onOpenProjectSettings }: ProjectCardProps) {
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
          {project.worktrees.map((worktree) => (
            <WorktreeRow key={worktree.path} worktree={worktree} />
          ))}
        </div>
      )}
    </div>
  );
}

interface WorktreeRowProps {
  worktree: Worktree;
}

function WorktreeRow({ worktree }: WorktreeRowProps) {
  const pr = mockPRs[worktree.branch] || null;
  const jiraIssue = worktree.issueNumber ? mockJiraIssues[worktree.issueNumber] : null;

  const handleClick = () => {
    console.log('Open IDE:', worktree.path);
    // TODO: Call Tauri to open IDE
  };

  return (
    <div className="worktree-row" onClick={handleClick}>
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

      {/* GitHub Status */}
      <div className="worktree-col-github">
        {pr ? <PRBadge pr={pr} /> : <span className="text-muted-light">—</span>}
      </div>

      {/* Jira Status */}
      <div className="worktree-col-jira">
        {jiraIssue ? <JiraBadge issue={jiraIssue} /> : <span className="text-muted-light">—</span>}
      </div>

      {/* Actions */}
      <div className="worktree-col-actions">
        <button className="worktree-more" title="More actions">
          <MoreHorizontal size={14} />
        </button>
      </div>
    </div>
  );
}

function PRBadge({ pr }: { pr: PullRequestInfo }) {
  const getStatusInfo = () => {
    if (pr.merged) {
      return { color: 'pr-merged', label: 'Merged' };
    }
    if (pr.state === 'closed') {
      return { color: 'pr-closed', label: 'Closed' };
    }
    if (pr.draft) {
      return { color: 'pr-draft', label: 'Draft' };
    }
    if (pr.checksStatus === 'failure') {
      return { color: 'pr-failed', label: 'Checks Failed' };
    }
    if (pr.reviewDecision === 'CHANGES_REQUESTED') {
      return { color: 'pr-changes', label: 'Changes Requested' };
    }
    if (pr.reviewDecision === 'APPROVED') {
      return { color: 'pr-approved', label: 'Approved' };
    }
    return { color: 'pr-open', label: 'Open' };
  };

  const { color, label } = getStatusInfo();

  return (
    <a
      href={pr.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`pr-badge ${color}`}
      title={label}
    >
      <Github size={12} />
      <span>#{pr.number}</span>
      <ExternalLink size={10} className="pr-external" />
    </a>
  );
}

function JiraBadge({ issue }: { issue: JiraIssue }) {
  const getStatusIcon = () => {
    switch (issue.statusCategory) {
      case 'done':
        return <CheckCircle2 size={12} className="jira-done" />;
      case 'inprogress':
        return <Clock size={12} className="jira-inprogress" />;
      default:
        return <Circle size={12} className="jira-todo" />;
    }
  };

  return (
    <a
      href={issue.url}
      target="_blank"
      rel="noopener noreferrer"
      className="jira-badge"
      title={issue.summary}
    >
      {getStatusIcon()}
      <span>{issue.key}</span>
      <ExternalLink size={10} className="jira-external" />
    </a>
  );
}
