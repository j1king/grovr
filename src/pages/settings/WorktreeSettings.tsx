import { useState } from 'react';
import { Plus, X } from 'lucide-react';

export function WorktreeSettings() {
  const [pathTemplate, setPathTemplate] = useState('{project}.worktrees/{branch}-{description}');
  const [fetchBeforeCreate, setFetchBeforeCreate] = useState(true);
  const [copyPaths, setCopyPaths] = useState<string[]>(['.env', 'config/local.json']);
  const [newCopyPath, setNewCopyPath] = useState('');

  const addCopyPath = () => {
    if (newCopyPath.trim() && !copyPaths.includes(newCopyPath.trim())) {
      setCopyPaths([...copyPaths, newCopyPath.trim()]);
      setNewCopyPath('');
    }
  };

  const removeCopyPath = (path: string) => {
    setCopyPaths(copyPaths.filter((p) => p !== path));
  };

  return (
    <div className="settings-section">
      <div className="settings-group first">
        <div className="settings-item-full">
          <label className="settings-label">Path Template</label>
          <p className="settings-hint">
            Variables: <code>{'{project}'}</code>, <code>{'{branch}'}</code>, <code>{'{description}'}</code>
          </p>
          <input
            type="text"
            className="settings-input mt-1.5"
            value={pathTemplate}
            onChange={(e) => setPathTemplate(e.target.value)}
          />
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <label className="settings-label">Fetch before create</label>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={fetchBeforeCreate}
              onChange={(e) => setFetchBeforeCreate(e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="settings-item-full">
          <label className="settings-label">Copy on create</label>
          <p className="settings-hint">Files to copy from main repo</p>
          <div className="copy-paths-list mt-1.5">
            {copyPaths.map((path) => (
              <div key={path} className="copy-path-item">
                <code>{path}</code>
                <button
                  className="copy-path-remove"
                  onClick={() => removeCopyPath(path)}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="copy-path-add">
            <input
              type="text"
              className="settings-input"
              placeholder=".env or config/"
              value={newCopyPath}
              onChange={(e) => setNewCopyPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCopyPath()}
            />
            <button className="btn-icon" onClick={addCopyPath}>
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
