import { useState } from 'react';
import { Folder } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as api from '@/lib/api';

interface AddProjectPageProps {
  onBack: () => void;
  onProjectAdded: () => void;
}

export function AddProjectPage({ onBack, onProjectAdded }: AddProjectPageProps) {
  const [name, setName] = useState('');
  const [repoPath, setRepoPath] = useState('');
  const [defaultBaseBranch, setDefaultBaseBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Git Repository',
      });
      if (selected && typeof selected === 'string') {
        setRepoPath(selected);
        // Auto-fill name from folder name
        const folderName = selected.split('/').pop() || '';
        if (!name) {
          setName(folderName);
        }
        // Try to get default branch
        try {
          const defaultBranch = await api.getDefaultBranch(selected);
          setDefaultBaseBranch(defaultBranch);
        } catch {
          // Ignore if not a git repo or no default branch
        }
      }
    } catch (err) {
      console.error('Failed to select folder:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !repoPath.trim()) {
      setError('Name and repository path are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.addProject({
        name: name.trim(),
        repo_path: repoPath.trim(),
        default_base_branch: defaultBaseBranch.trim() || undefined,
      });
      onProjectAdded();
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header - drag area */}
      <div data-tauri-drag-region className="titlebar" />

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="page-wrapper">
          <div className="page-content">
            <h1 className="page-title">Add Project</h1>

            <form onSubmit={handleSubmit}>
              <div className="settings-group">
                {/* Repository Path */}
                <div className="settings-item-full">
                  <label className="settings-label">Repository Path</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="settings-input flex-1 font-mono text-xs"
                      value={repoPath}
                      onChange={(e) => setRepoPath(e.target.value)}
                      placeholder="/path/to/repository"
                    />
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={handleSelectFolder}
                      title="Browse"
                    >
                      <Folder size={14} />
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div className="settings-item-full">
                  <label className="settings-label">Project Name</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="my-project"
                  />
                </div>

                {/* Default Base Branch */}
                <div className="settings-item-full">
                  <label className="settings-label">Default Base Branch</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={defaultBaseBranch}
                    onChange={(e) => setDefaultBaseBranch(e.target.value)}
                    placeholder="origin/main"
                  />
                </div>

                {error && (
                  <div className="text-xs text-red-500 mt-2">{error}</div>
                )}
              </div>

              <div className="flex gap-2 mt-6">
                <button type="button" className="btn-secondary" onClick={onBack}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
