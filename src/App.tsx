import { useEffect, useState, useCallback, useRef } from 'react';
import { WorktreeListPage } from '@/pages/WorktreeListPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ProjectSettingsPage } from '@/pages/ProjectSettingsPage';
import { AddProjectPage } from '@/pages/AddProjectPage';
import { CreateWorktreePage } from '@/pages/CreateWorktreePage';
import { EditWorktreePage } from '@/pages/EditWorktreePage';
import { readText } from '@tauri-apps/plugin-clipboard-manager';
import * as api from '@/lib/api';
import type { Project, Worktree, IDEPreset } from '@/types';
import './index.css';

type Page = 'worktrees' | 'settings' | 'project-settings' | 'add-project' | 'create-worktree' | 'edit-worktree';
type ThemeMode = 'system' | 'light' | 'dark';

interface ParsedClipboard {
  issueNumber: string;
  description: string;
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

function App() {
  const [page, setPage] = useState<Page>('worktrees');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedWorktree, setSelectedWorktree] = useState<Worktree | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [clipboardData, setClipboardData] = useState<ParsedClipboard | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const clipboardPatternsRef = useRef<string[]>(['\\[(?<issueNumber>[A-Z]+-\\d+)\\]\\s*(?<description>.+)']);

  // Load saved theme and clipboard pattern on startup
  useEffect(() => {
    api.getSettings()
      .then((settings) => {
        const savedTheme = (settings.theme as ThemeMode) || 'system';
        setTheme(savedTheme);
        applyTheme(savedTheme);
        if (settings.clipboard_parse_patterns && settings.clipboard_parse_patterns.length > 0) {
          clipboardPatternsRef.current = settings.clipboard_parse_patterns;
        }
      })
      .catch(() => {
        applyTheme('system');
      });
  }, []);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // cmd+, : Open settings
      if (e.metaKey && e.key === ',') {
        e.preventDefault();
        setPage('settings');
        return;
      }

      // cmd+v : Parse clipboard and open create worktree page
      if (e.metaKey && e.key === 'v') {
        // Don't intercept if focus is on input/textarea
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          return;
        }

        try {
          const text = await readText();
          if (!text || clipboardPatternsRef.current.length === 0) return;

          // Try each pattern until one matches
          let matchedData: ParsedClipboard | null = null;
          for (const pattern of clipboardPatternsRef.current) {
            try {
              const regex = new RegExp(pattern);
              const match = text.match(regex);
              if (match?.groups) {
                matchedData = {
                  issueNumber: match.groups.issueNumber || '',
                  description: match.groups.description || '',
                };
                break;
              }
            } catch {
              // Invalid regex, skip
            }
          }

          if (matchedData) {
            e.preventDefault();

            // Load projects and select the first one
            const projects = await api.getProjects();
            if (projects.length === 0) return;

            const firstProject = projects[0];
            setSelectedProject({
              name: firstProject.name,
              repoPath: firstProject.repo_path,
              defaultBaseBranch: firstProject.default_base_branch,
              ide: firstProject.ide?.preset as IDEPreset | undefined,
              worktrees: [],
            });
            setClipboardData(matchedData);
            setPage('create-worktree');
          }
        } catch {
          // Clipboard access denied or parse failed - ignore
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenProjectSettings = (project: Project) => {
    setSelectedProject(project);
    setPage('project-settings');
  };

  const handleCreateWorktree = (project: Project) => {
    setSelectedProject(project);
    setPage('create-worktree');
  };

  const handleEditWorktree = (worktree: Worktree, repoPath: string) => {
    setSelectedWorktree({ ...worktree, repoPath });
    setPage('edit-worktree');
  };

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="app-container">
      {page === 'worktrees' && (
        <WorktreeListPage
          key={refreshKey}
          onOpenSettings={() => setPage('settings')}
          onOpenProjectSettings={handleOpenProjectSettings}
          onAddProject={() => setPage('add-project')}
          onCreateWorktree={handleCreateWorktree}
          onEditWorktree={handleEditWorktree}
          expandedProjects={expandedProjects}
          onExpandedProjectsChange={setExpandedProjects}
        />
      )}
      {page === 'settings' && (
        <SettingsPage onBack={() => setPage('worktrees')} />
      )}
      {page === 'project-settings' && selectedProject && (
        <ProjectSettingsPage
          project={selectedProject}
          onBack={() => setPage('worktrees')}
          onDeleted={() => {
            handleRefresh();
            setPage('worktrees');
          }}
          onSaved={handleRefresh}
        />
      )}
      {page === 'add-project' && (
        <AddProjectPage
          onBack={() => setPage('worktrees')}
          onProjectAdded={handleRefresh}
        />
      )}
      {page === 'create-worktree' && selectedProject && (
        <CreateWorktreePage
          project={selectedProject}
          onBack={() => {
            setPage('worktrees');
            setClipboardData(null);
          }}
          onWorktreeCreated={() => {
            handleRefresh();
            setClipboardData(null);
          }}
          initialData={clipboardData}
          allowProjectChange={!!clipboardData}
        />
      )}
      {page === 'edit-worktree' && selectedWorktree && (
        <EditWorktreePage
          worktree={selectedWorktree}
          onBack={() => setPage('worktrees')}
          onSaved={handleRefresh}
        />
      )}
    </div>
  );
}

export default App;
