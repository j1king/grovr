import { ArrowLeft, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Project } from '@/types';

interface ProjectSettingsPageProps {
  project: Project;
  onBack: () => void;
}

export function ProjectSettingsPage({ project, onBack }: ProjectSettingsPageProps) {
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
          <div className="project-settings-title-row">
            <span className="project-settings-emoji">{project.emoji || '📁'}</span>
            <h1 className="project-settings-title">{project.name}</h1>
          </div>

          <div className="settings-group">
            {/* Name */}
            <div className="settings-item-full">
              <label className="settings-label">Project Name</label>
              <input
                type="text"
                className="settings-input"
                defaultValue={project.name}
              />
            </div>

            {/* Emoji */}
            <div className="settings-item-full">
              <label className="settings-label">Emoji</label>
              <input
                type="text"
                className="settings-input"
                defaultValue={project.emoji || ''}
                placeholder="e.g., 🌳"
              />
            </div>

            {/* Repository Path */}
            <div className="settings-item-full">
              <label className="settings-label">Repository Path</label>
              <input
                type="text"
                className="settings-input font-mono text-xs"
                defaultValue={project.repoPath}
                readOnly
              />
            </div>

            {/* Default Base Branch */}
            <div className="settings-item-full">
              <label className="settings-label">Default Base Branch</label>
              <input
                type="text"
                className="settings-input"
                defaultValue={project.defaultBaseBranch || ''}
                placeholder="e.g., origin/main"
              />
            </div>

            {/* IDE Override */}
            <div className="settings-item-full">
              <label className="settings-label">IDE (Project Override)</label>
              <p className="settings-hint mb-2">Override the default IDE for this project</p>
              <select className="settings-select w-full">
                <option value="">Use Default</option>
                <option value="code">VS Code</option>
                <option value="cursor">Cursor</option>
                <option value="idea">IntelliJ IDEA</option>
                <option value="webstorm">WebStorm</option>
                <option value="pycharm">PyCharm</option>
                <option value="goland">GoLand</option>
              </select>
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
                <button className="btn-danger">
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </ScrollArea>
    </div>
  );
}
