import { useEffect, useState } from 'react';
import { platform } from '@tauri-apps/plugin-os';
import * as api from '@/lib/api';

const terminalOptions = [
  { app: 'Terminal', name: 'Terminal' },
  { app: 'iTerm', name: 'iTerm2' },
  { app: 'Warp', name: 'Warp' },
];

export function TerminalSettings() {
  const [isMac] = useState(() => platform() === 'macos');
  const [selectedApp, setSelectedApp] = useState('Terminal');
  const [savedApp, setSavedApp] = useState('Terminal');
  const [customApp, setCustomApp] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSettings().then((settings) => {
      const app = settings.terminal?.app || 'Terminal';
      setSavedApp(app);
      if (terminalOptions.some((option) => option.app === app)) {
        setSelectedApp(app);
      } else {
        setSelectedApp('custom');
        setCustomApp(app);
      }
    }).catch((err) => {
      setError(`Failed to load terminal setting: ${err}`);
    }).finally(() => setLoading(false));
  }, []);

  const saveApp = async (app: string) => {
    setSaving(true);
    setError('');
    try {
      await api.setTerminal({ app });
      setSavedApp(app);
      return true;
    } catch (err) {
      setError(`Failed to save terminal setting: ${err}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSelection = async (app: string) => {
    const previous = selectedApp;
    setSelectedApp(app);
    setError('');
    if (app !== 'custom' && !(await saveApp(app))) {
      setSelectedApp(previous);
    }
  };

  return (
    <div className="settings-section">
      <div className="settings-group first">
        {!isMac ? (
          <p className="settings-hint">Terminal selection is available on macOS.</p>
        ) : loading ? (
          <div className="text-muted-foreground text-xs">Loading...</div>
        ) : (
          <>
            <div className="settings-item">
              <div className="settings-item-info">
                <label className="settings-label" htmlFor="terminal-app">Default terminal</label>
                <p className="settings-hint">Open worktrees in your preferred terminal app</p>
              </div>
              <select
                id="terminal-app"
                className="settings-select"
                value={selectedApp}
                disabled={saving}
                onChange={(e) => void handleSelection(e.target.value)}
              >
                {terminalOptions.map((option) => (
                  <option key={option.app} value={option.app}>{option.name}</option>
                ))}
                <option value="custom">Custom</option>
              </select>
            </div>
            {selectedApp === 'custom' && (
              <form
                className="settings-item-full"
                onSubmit={(e) => {
                  e.preventDefault();
                  const app = customApp.trim();
                  if (app && !saving) void saveApp(app);
                }}
              >
                <label className="settings-label" htmlFor="terminal-custom-app">Application name or path</label>
                <p className="settings-hint">Choose an installed macOS app that can open folders</p>
                <input
                  id="terminal-custom-app"
                  className="settings-input mt-1.5"
                  type="text"
                  placeholder="MyTerminal or /Applications/MyTerminal.app"
                  value={customApp}
                  disabled={saving}
                  onChange={(e) => setCustomApp(e.target.value)}
                />
                <button
                  className="btn-secondary-sm mt-2"
                  type="submit"
                  disabled={saving || !customApp.trim() || customApp.trim() === savedApp}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </form>
            )}
          </>
        )}
        {error && <p className="settings-hint text-destructive" role="alert">{error}</p>}
      </div>
    </div>
  );
}
