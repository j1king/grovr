import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as api from '@/lib/api';
import type { Project } from '@/types';

interface CreateWorktreePageProps {
  project: Project;
  onBack: () => void;
  onWorktreeCreated: () => void;
}

export function CreateWorktreePage({ project, onBack, onWorktreeCreated }: CreateWorktreePageProps) {
  const [issueNumber, setIssueNumber] = useState('');
  const [branchName, setBranchName] = useState('');
  const [description, setDescription] = useState('');
  const [baseBranch, setBaseBranch] = useState('');
  const [worktreePath, setWorktreePath] = useState('');
  const [openIDE, setOpenIDE] = useState(true);
  const [fetchBeforeCreate, setFetchBeforeCreate] = useState(true);
  const [branches, setBranches] = useState<{ local: string[]; remote: string[] }>({ local: [], remote: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<api.BackendAppSettings | null>(null);

  useEffect(() => {
    loadInitialData();
  }, [project]);

  // Auto-generate path when branch name or description changes
  useEffect(() => {
    if (branchName) {
      const template = settings?.default_worktree_template || '{project}.worktrees/{branch}-{description}';
      const descriptionSlug = description
        .trim()
        .replace(/[\/:*?"<>|\\&;'`$#%!()[\]{}]/g, '_')
        .replace(/\s+/g, '-');
      const parentPath = project.repoPath.split('/').slice(0, -1).join('/');
      const projectName = project.repoPath.split('/').pop() || project.name;

      let path = template
        .replace('{project}', `${parentPath}/${projectName}`)
        .replace('{branch}', branchName)
        .replace('{description}', descriptionSlug);
      path = path.replace(/-$/, '');
      setWorktreePath(path);
    } else {
      setWorktreePath('');
    }
  }, [branchName, description, project, settings]);

  const loadInitialData = async () => {
    try {
      const [settingsData, branchList] = await Promise.all([
        api.getSettings(),
        api.getBranches(project.repoPath, true),
      ]);
      setSettings(settingsData);
      setFetchBeforeCreate(settingsData.fetch_before_create ?? true);

      // Separate local and remote branches
      const local: string[] = [];
      const remote: string[] = [];
      branchList.forEach((b) => {
        if (b.is_remote) {
          remote.push(b.name);
        } else {
          local.push(b.name);
        }
      });
      setBranches({ local, remote });

      // Set default base branch
      const defaultBase = project.defaultBaseBranch || 'origin/main';
      setBaseBranch(defaultBase);
    } catch {
      // Ignore error
    }
  };

  // Auto-fill branch name when issue number changes
  const handleIssueNumberChange = (value: string) => {
    const prevIssue = issueNumber;
    setIssueNumber(value);
    // If branch name was synced with issue number, keep it synced
    if (branchName === '' || branchName === prevIssue) {
      setBranchName(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim() || !worktreePath.trim()) {
      setError('Branch name and worktree path are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Fetch if needed
      if (fetchBeforeCreate && baseBranch.startsWith('origin/')) {
        await api.gitFetch(project.repoPath);
      }

      // Create worktree
      await api.createWorktree(
        project.repoPath,
        worktreePath.trim(),
        branchName.trim(),
        baseBranch.trim()
      );

      // Copy paths if configured
      const copyPaths = settings?.copy_paths || [];
      if (copyPaths.length > 0) {
        // Find main worktree path
        const worktrees = await api.getWorktrees(project.repoPath);
        const mainWorktree = worktrees.find((w) => w.is_main);
        if (mainWorktree) {
          await api.copyPathsToWorktree(mainWorktree.path, worktreePath.trim(), copyPaths);
        }
      }

      // Open IDE if enabled
      if (openIDE && settings) {
        const preset = settings.ide?.preset || 'code';
        const customCommand = settings.ide?.custom_command;
        await api.openIde(worktreePath.trim(), preset, customCommand);
      }

      onWorktreeCreated();
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const isRemoteBranch = baseBranch.startsWith('origin/') || branches.remote.includes(baseBranch);
  const copyPaths = settings?.copy_paths || [];

  return (
    <div className="h-full flex flex-col">
      {/* Header - drag area */}
      <div data-tauri-drag-region className="titlebar" />

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="page-wrapper">
          <div className="page-content">
            <h1 className="page-title">New Worktree</h1>

            <form onSubmit={handleSubmit}>
              <div className="settings-group mt-4">
                {/* Project (read-only) */}
                <div className="settings-item-full">
                  <label className="settings-label">Project</label>
                  <input
                    type="text"
                    className="settings-input settings-input-readonly"
                    value={project.name}
                    readOnly
                  />
                </div>

                {/* Base Branch */}
                <div className="settings-item-full">
                  <label className="settings-label">Base Branch</label>
                  <select
                    className="settings-select w-full"
                    value={baseBranch}
                    onChange={(e) => setBaseBranch(e.target.value)}
                  >
                    {branches.local.length > 0 && (
                      <optgroup label="Local">
                        {branches.local.map((branch) => (
                          <option key={branch} value={branch}>
                            {branch}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {branches.remote.length > 0 && (
                      <optgroup label="Remote">
                        {branches.remote.map((branch) => (
                          <option key={branch} value={branch}>
                            {branch}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  {isRemoteBranch && (
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fetchBeforeCreate}
                        onChange={(e) => setFetchBeforeCreate(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-xs text-muted-foreground">Fetch before create</span>
                    </label>
                  )}
                </div>

                {/* Issue Number */}
                <div className="settings-item-full">
                  <label className="settings-label">Issue Number</label>
                  <input
                    type="text"
                    className="settings-input font-mono"
                    value={issueNumber}
                    onChange={(e) => handleIssueNumberChange(e.target.value)}
                    placeholder="ABC-1234"
                  />
                </div>

                {/* New Branch Name */}
                <div className="settings-item-full">
                  <label className="settings-label">New Branch Name</label>
                  <input
                    type="text"
                    className="settings-input font-mono"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="ABC-1234"
                  />
                </div>

                {/* Description */}
                <div className="settings-item-full">
                  <label className="settings-label">Description (optional)</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the work"
                  />
                </div>

                {/* Worktree Path */}
                <div className="settings-item-full">
                  <label className="settings-label">Worktree Path</label>
                  <input
                    type="text"
                    className="settings-input font-mono text-xs"
                    value={worktreePath}
                    onChange={(e) => setWorktreePath(e.target.value)}
                    placeholder="Path will be generated automatically"
                  />
                </div>

                {/* Copy paths */}
                {copyPaths.length > 0 && (
                  <div className="settings-item-full">
                    <label className="settings-label">Copy paths</label>
                    <div className="flex flex-wrap gap-1">
                      {copyPaths.map((p, i) => (
                        <span key={i} className="px-2 py-0.5 text-xs font-mono bg-muted rounded">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Open IDE */}
                <div className="settings-item-full">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={openIDE}
                      onChange={(e) => setOpenIDE(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Open IDE after creation</span>
                  </label>
                </div>

                {error && <div className="text-xs text-red-500 mt-2">{error}</div>}
              </div>

              <div className="flex gap-2 mt-6">
                <button type="button" className="btn-secondary" onClick={onBack}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading || !branchName.trim() || !worktreePath.trim()}
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
