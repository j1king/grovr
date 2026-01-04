import { useEffect, useState } from 'react';
import { WorktreeListPage } from '@/pages/WorktreeListPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ProjectSettingsPage } from '@/pages/ProjectSettingsPage';
import type { Project } from '@/types';
import './index.css';

type Page = 'worktrees' | 'settings' | 'project-settings';

function App() {
  const [page, setPage] = useState<Page>('worktrees');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    document.documentElement.classList.toggle('dark', mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const handleOpenProjectSettings = (project: Project) => {
    setSelectedProject(project);
    setPage('project-settings');
  };

  return (
    <div className="app-container">
      {page === 'worktrees' && (
        <WorktreeListPage
          onOpenSettings={() => setPage('settings')}
          onOpenProjectSettings={handleOpenProjectSettings}
        />
      )}
      {page === 'settings' && (
        <SettingsPage onBack={() => setPage('worktrees')} />
      )}
      {page === 'project-settings' && selectedProject && (
        <ProjectSettingsPage
          project={selectedProject}
          onBack={() => setPage('worktrees')}
        />
      )}
    </div>
  );
}

export default App;
