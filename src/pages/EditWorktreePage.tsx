import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as api from '@/lib/api';
import type { Worktree } from '@/types';

interface EditWorktreePageProps {
  worktree: Worktree;
  onBack: () => void;
  onSaved: () => void;
}

export function EditWorktreePage({ worktree, onBack, onSaved }: EditWorktreePageProps) {
  const [branchName, setBranchName] = useState(worktree.branch);
  const [issueNumber, setIssueNumber] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const originalBranch = worktree.branch;
  const repoPath = worktree.repoPath;

  useEffect(() => {
    loadMemo();
  }, [worktree.path]);

  const loadMemo = async () => {
    try {
      const memo = await api.getWorktreeMemo(worktree.path);
      setIssueNumber(memo.issue_number || '');
      setDescription(memo.description || '');
    } catch {
      // Ignore - use defaults
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      // Rename branch if changed
      if (branchName.trim() !== originalBranch && repoPath) {
        await api.renameBranch(repoPath, originalBranch, branchName.trim());
      }

      // Save memo
      await api.setWorktreeMemo(worktree.path, {
        description: description.trim() || undefined,
        issue_number: issueNumber.trim() || undefined,
      });

      onSaved();
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!repoPath) return;

    const confirmed = await ask(
      `Are you sure you want to delete the worktree "${worktree.branch}"?\n\nThis will remove the worktree directory and its contents.`,
      {
        title: 'Delete Worktree',
        kind: 'warning',
        okLabel: 'Delete',
        cancelLabel: 'Cancel',
      }
    );
    if (!confirmed) return;

    try {
      await api.removeWorktree(repoPath, worktree.path, false);
      onSaved();
      onBack();
    } catch (err) {
      console.error('Failed to delete worktree:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);

      const forceDelete = await ask(
        `Failed to delete worktree: ${errorMessage}\n\nDo you want to force delete? This will discard any uncommitted changes.`,
        {
          title: 'Force Delete',
          kind: 'warning',
          okLabel: 'Force Delete',
          cancelLabel: 'Cancel',
        }
      );

      if (forceDelete) {
        try {
          await api.removeWorktree(repoPath, worktree.path, true);
          onSaved();
          onBack();
        } catch (forceErr) {
          const forceErrorMessage = forceErr instanceof Error ? forceErr.message : String(forceErr);
          await message(`Failed to force delete worktree: ${forceErrorMessage}`, {
            title: 'Error',
            kind: 'error',
          });
        }
      }
    }
  };

  const isMainBranch = worktree.isMain;

  return (
    <div className="h-full flex flex-col">
      {/* Header - drag area */}
      <div data-tauri-drag-region className="titlebar" />

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="page-wrapper">
          <div className="page-content">
            <h1 className="page-title">Edit Worktree</h1>

            <div className="settings-group mt-4">
              {/* Branch */}
              <div className="settings-item-full">
                <label className="settings-label">Branch</label>
                {isMainBranch ? (
                  <input
                    type="text"
                    className="settings-input settings-input-readonly font-mono"
                    value={branchName}
                    readOnly
                  />
                ) : (
                  <input
                    type="text"
                    className="settings-input font-mono"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="Branch name"
                  />
                )}
                {isMainBranch && (
                  <p className="settings-hint mt-1">Main branch cannot be renamed</p>
                )}
              </div>

              {/* Path (read-only) */}
              <div className="settings-item-full">
                <label className="settings-label">Directory</label>
                <input
                  type="text"
                  className="settings-input settings-input-readonly font-mono text-xs"
                  value={worktree.path}
                  readOnly
                />
              </div>

              {/* Issue Number */}
              <div className="settings-item-full">
                <label className="settings-label">Issue Number</label>
                <input
                  type="text"
                  className="settings-input font-mono"
                  value={issueNumber}
                  onChange={(e) => setIssueNumber(e.target.value)}
                  placeholder="e.g., PROJ-123"
                />
              </div>

              {/* Description */}
              <div className="settings-item-full">
                <label className="settings-label">Description</label>
                <input
                  type="text"
                  className="settings-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this worktree"
                />
              </div>

              {error && <div className="text-xs text-red-500 mt-2">{error}</div>}
            </div>

            <div className="flex gap-2 mt-6">
              <button type="button" className="btn-secondary" onClick={onBack}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || (!branchName.trim())}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>

            {/* Danger Zone */}
            {!isMainBranch && (
              <div className="danger-zone mt-8">
                <h3 className="danger-zone-title">Danger Zone</h3>
                <div className="danger-zone-content">
                  <div className="danger-zone-item">
                    <div>
                      <div className="danger-zone-item-title">Delete Worktree</div>
                      <div className="danger-zone-item-desc">
                        Remove the worktree directory and its contents
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={handleDelete}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
