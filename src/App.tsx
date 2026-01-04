import { useEffect, useState, useCallback } from 'react';
import { WorktreeListPage } from '@/pages/WorktreeListPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ProjectSettingsPage } from '@/pages/ProjectSettingsPage';
import { AddProjectPage } from '@/pages/AddProjectPage';
import { CreateWorktreePage } from '@/pages/CreateWorktreePage';
import { EditWorktreePage } from '@/pages/EditWorktreePage';
import * as api from '@/lib/api';
import type { Project, Worktree } from '@/types';
import './index.css';

type Page = 'worktrees' | 'settings' | 'project-settings' | 'add-project' | 'create-worktree' | 'edit-worktree';
type ThemeMode = 'system' | 'light' | 'dark';

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

  // Load saved theme on startup
  useEffect(() => {
    api.getSettings()
      .then((settings) => {
        const savedTheme = (settings.theme as ThemeMode) || 'system';
        setTheme(savedTheme);
        applyTheme(savedTheme);
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
          onBack={() => setPage('worktrees')}
          onWorktreeCreated={handleRefresh}
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
