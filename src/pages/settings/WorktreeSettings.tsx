import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import * as api from '@/lib/api';

const DEFAULT_PATTERN = '\\[(?<issueNumber>[A-Z]+-\\d+)\\]\\s*(?<description>.+)';

export function WorktreeSettings() {
  const [pathTemplate, setPathTemplate] = useState('{project}.worktrees/{branch}-{description}');
  const [fetchBeforeCreate, setFetchBeforeCreate] = useState(true);
  const [copyPaths, setCopyPaths] = useState<string[]>([]);
  const [newCopyPath, setNewCopyPath] = useState('');
  const [clipboardPatterns, setClipboardPatterns] = useState<string[]>([]);
  const [newPattern, setNewPattern] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await api.getSettings();
      setPathTemplate(settings.default_worktree_template || '{project}.worktrees/{branch}-{description}');
      setFetchBeforeCreate(settings.fetch_before_create ?? true);
      setCopyPaths(settings.copy_paths || []);
      const patterns = settings.clipboard_parse_patterns || [];
      setClipboardPatterns(patterns.length > 0 ? patterns : [DEFAULT_PATTERN]);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePathTemplateChange = async (value: string) => {
    setPathTemplate(value);
  };

  const handlePathTemplateBlur = async () => {
    try {
      await api.setDefaultWorktreeTemplate(pathTemplate);
    } catch (err) {
      console.error('Failed to save path template:', err);
    }
  };

  const handleFetchBeforeCreate = async (enabled: boolean) => {
    setFetchBeforeCreate(enabled);
    try {
      await api.setFetchBeforeCreate(enabled);
    } catch (err) {
      console.error('Failed to save fetch before create:', err);
      setFetchBeforeCreate(!enabled);
    }
  };

  const addCopyPath = async () => {
    if (newCopyPath.trim() && !copyPaths.includes(newCopyPath.trim())) {
      const newPaths = [...copyPaths, newCopyPath.trim()];
      setCopyPaths(newPaths);
      setNewCopyPath('');
      try {
        await api.setCopyPaths(newPaths);
      } catch (err) {
        console.error('Failed to save copy paths:', err);
        setCopyPaths(copyPaths);
      }
    }
  };

  const removeCopyPath = async (path: string) => {
    const newPaths = copyPaths.filter((p) => p !== path);
    setCopyPaths(newPaths);
    try {
      await api.setCopyPaths(newPaths);
    } catch (err) {
      console.error('Failed to save copy paths:', err);
      setCopyPaths(copyPaths);
    }
  };

  const addClipboardPattern = async () => {
    if (newPattern.trim() && !clipboardPatterns.includes(newPattern.trim())) {
      // Validate regex
      try {
        new RegExp(newPattern.trim());
      } catch {
        return; // Invalid regex
      }
      const newPatterns = [...clipboardPatterns, newPattern.trim()];
      setClipboardPatterns(newPatterns);
      setNewPattern('');
      try {
        await api.setClipboardParsePatterns(newPatterns);
      } catch (err) {
        console.error('Failed to save clipboard patterns:', err);
        setClipboardPatterns(clipboardPatterns);
      }
    }
  };

  const removeClipboardPattern = async (pattern: string) => {
    const newPatterns = clipboardPatterns.filter((p) => p !== pattern);
    setClipboardPatterns(newPatterns);
    try {
      await api.setClipboardParsePatterns(newPatterns);
    } catch (err) {
      console.error('Failed to save clipboard patterns:', err);
      setClipboardPatterns(clipboardPatterns);
    }
  };

  if (loading) {
    return (
      <div className="settings-section">
        <div className="settings-group first">
          <div className="text-muted-foreground text-xs">Loading...</div>
        </div>
      </div>
    );
  }

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
            onChange={(e) => handlePathTemplateChange(e.target.value)}
            onBlur={handlePathTemplateBlur}
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
              onChange={(e) => handleFetchBeforeCreate(e.target.checked)}
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

        <div className="settings-item-full">
          <label className="settings-label">Clipboard patterns</label>
          <p className="settings-hint">
            Regex patterns to parse clipboard (cmd+v). Use named groups: <code>issueNumber</code>, <code>description</code>
          </p>
          <div className="copy-paths-list mt-1.5">
            {clipboardPatterns.map((pattern) => (
              <div key={pattern} className="copy-path-item">
                <code className="text-xs break-all">{pattern}</code>
                <button
                  className="copy-path-remove"
                  onClick={() => removeClipboardPattern(pattern)}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="copy-path-add">
            <input
              type="text"
              className="settings-input font-mono text-xs"
              placeholder="(?<issueNumber>...)"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addClipboardPattern()}
            />
            <button className="btn-icon" onClick={addClipboardPattern}>
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
