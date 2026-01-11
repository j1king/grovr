import { useState, useEffect } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import * as api from '@/lib/api';
import { ideOptions } from '@/lib/ide-config';
import type { Project } from '@/types';

interface ProjectSettingsPageProps {
  project: Project;
  onBack: () => void;
  onDeleted: () => void;
  onSaved: () => void;
}

export function ProjectSettingsPage({ project, onBack, onDeleted, onSaved }: ProjectSettingsPageProps) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [name, setName] = useState(project.name);
  const [defaultBaseBranch, setDefaultBaseBranch] = useState(project.defaultBaseBranch || '');
  const [ideOverride, setIdeOverride] = useState(project.ide || '');

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    loadBranches();
  }, [project.repoPath]);

  const loadBranches = async () => {
    try {
      const branchList = await api.getBranches(project.repoPath, true);
      setBranches(branchList.map((b) => b.name));
    } catch {
      // Ignore
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedProject: api.BackendProjectConfig = {
        name: name.trim(),
        repo_path: project.repoPath,
        default_base_branch: defaultBaseBranch || undefined,
        ide: ideOverride ? { type: 'preset', preset: ideOverride } : undefined,
      };
      await api.updateProject(project.repoPath, updatedProject);
      onSaved();
      onBack();
    } catch (err) {
      console.error('Failed to save project:', err);
    } finally {
      setSaving(false);
    }
  };

  // Cmd/Ctrl+Enter to save
  useKeyboardShortcut({ key: 'Enter', cmdOrCtrl: true }, handleSave, !saving && !!name.trim());

  const handleDelete = () => {
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    setDeleting(true);
    try {
      await api.removeProject(project.repoPath);
      onDeleted();
    } catch (err) {
      console.error('Failed to delete project:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div data-tauri-drag-region className="project-settings-header">
        <button className="project-settings-back no-drag" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="project-settings-wrapper">
          <div className="project-settings-content">
          <h1 className="project-settings-title">{project.name}</h1>

          <div className="settings-group">
            {/* Name */}
            <div className="settings-item-full">
              <label className="settings-label">Project Name</label>
              <input
                type="text"
                className="settings-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Repository Path */}
            <div className="settings-item-full">
              <label className="settings-label">Repository Path</label>
              <input
                type="text"
                className="settings-input settings-input-readonly font-mono text-xs"
                defaultValue={project.repoPath}
                readOnly
              />
            </div>

            {/* Default Base Branch */}
            <div className="settings-item-full">
              <label className="settings-label">Default Base Branch</label>
              <select
                className="settings-select w-full"
                value={defaultBaseBranch}
                onChange={(e) => setDefaultBaseBranch(e.target.value)}
              >
                <option value="">Select branch...</option>
                {branches.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>

            {/* IDE Override */}
            <div className="settings-item-full">
              <label className="settings-label">IDE (Project Override)</label>
              <p className="settings-hint mb-2">Override the default IDE for this project</p>
              <select
                className="settings-select w-full"
                value={ideOverride}
                onChange={(e) => setIdeOverride(e.target.value)}
              >
                <option value="">Use Default</option>
                {ideOptions.map((ide) => (
                  <option key={ide.id} value={ide.id}>
                    {ide.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <button type="button" className="btn-secondary" onClick={onBack}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || !name.trim()}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="danger-zone">
            <h3 className="danger-zone-title">Danger Zone</h3>
            <div className="danger-zone-content">
              <div className="danger-zone-item">
                <div>
                  <div className="danger-zone-item-title">Delete Project</div>
                  <div className="danger-zone-item-desc">
                    Remove this project from Grovr. This will not delete the actual repository.
                  </div>
                </div>
                <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                  <Trash2 size={14} />
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </ScrollArea>

      {/* Delete Project Confirmation Modal */}
      <ConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Project"
        description={`Are you sure you want to remove "${project.name}" from Grovr?\n\nThis will not delete the actual repository.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={executeDelete}
        onCancel={() => {}}
      />
    </div>
  );
}
