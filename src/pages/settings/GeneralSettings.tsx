import { useState, useEffect, useCallback } from 'react';
import * as api from '@/lib/api';

// Convert keyboard event to Tauri shortcut format
function formatShortcut(e: KeyboardEvent): string | null {
  // Ignore modifier-only keys
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
    return null;
  }

  const parts: string[] = [];

  // CommandOrControl: Cmd on macOS, Ctrl on Windows/Linux
  if (e.metaKey || e.ctrlKey) {
    parts.push('CommandOrControl');
  }
  if (e.altKey) {
    parts.push('Alt');
  }
  if (e.shiftKey) {
    parts.push('Shift');
  }

  // Normalize key names
  let key = e.key;
  if (key === ' ') key = 'Space';
  else if (key.length === 1) key = key.toUpperCase();
  else if (key === 'ArrowUp') key = 'Up';
  else if (key === 'ArrowDown') key = 'Down';
  else if (key === 'ArrowLeft') key = 'Left';
  else if (key === 'ArrowRight') key = 'Right';

  parts.push(key);

  return parts.join('+');
}

// Format shortcut for display (e.g., "Cmd + Shift + G")
function formatDisplayShortcut(shortcut: string): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return shortcut
    .replace('CommandOrControl', isMac ? 'Cmd' : 'Ctrl')
    .replace(/\+/g, ' + ');
}

export function GeneralSettings() {
  const [launchAtStartup, setLaunchAtStartup] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState<string>('5');
  const [globalShortcut, setGlobalShortcut] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await api.getSettings();
      setLaunchAtStartup(settings.launch_at_startup ?? false);
      setAutoRefresh(settings.refresh_interval_minutes === 0 ? 'off' : String(settings.refresh_interval_minutes));
      setGlobalShortcut(settings.global_shortcut ?? null);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchAtStartup = async (enabled: boolean) => {
    setLaunchAtStartup(enabled);
    try {
      await api.setLaunchAtStartup(enabled);
    } catch (err) {
      console.error('Failed to save launch at startup:', err);
      setLaunchAtStartup(!enabled); // Revert on error
    }
  };

  const handleAutoRefresh = async (value: string) => {
    setAutoRefresh(value);
    try {
      const minutes = value === 'off' ? 0 : parseInt(value, 10);
      await api.setRefreshIntervalMinutes(minutes);
    } catch (err) {
      console.error('Failed to save refresh interval:', err);
    }
  };

  // Shortcut recording handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const shortcut = formatShortcut(e);
    if (shortcut) {
      setGlobalShortcut(shortcut);
      setIsRecording(false);

      // Save to backend
      api.setGlobalShortcut(shortcut).catch(err => {
        console.error('Failed to save shortcut:', err);
        setGlobalShortcut(null);
      });
    }
  }, []);

  // Toggle recording mode
  useEffect(() => {
    if (isRecording) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isRecording, handleKeyDown]);

  const handleClearShortcut = async () => {
    setGlobalShortcut(null);
    try {
      await api.setGlobalShortcut(null);
    } catch (err) {
      console.error('Failed to clear shortcut:', err);
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
        {/* Launch at Startup */}
        <div className="settings-item">
          <div className="settings-item-info">
            <label className="settings-label">Launch at startup</label>
            <p className="settings-hint">Automatically open Grovr when you log in</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={launchAtStartup}
              onChange={(e) => handleLaunchAtStartup(e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        {/* Auto Refresh */}
        <div className="settings-item">
          <div className="settings-item-info">
            <label className="settings-label">Auto-refresh interval</label>
            <p className="settings-hint">
              Automatically refresh worktree list and PR status
            </p>
          </div>
          <select
            className="settings-select"
            value={autoRefresh}
            onChange={(e) => handleAutoRefresh(e.target.value)}
          >
            <option value="off">Off</option>
            <option value="1">1 minute</option>
            <option value="5">5 minutes</option>
            <option value="10">10 minutes</option>
            <option value="30">30 minutes</option>
          </select>
        </div>

        {/* Global Shortcut */}
        <div className="settings-item">
          <div className="settings-item-info">
            <label className="settings-label">Global shortcut</label>
            <p className="settings-hint">
              Press a key combination to show/hide the app (e.g. <code>Cmd + .</code>)
            </p>
          </div>
          <div className="shortcut-recorder">
            {isRecording ? (
              <div className="shortcut-display recording">
                <span className="recording-indicator" />
                <span className="shortcut-placeholder">Recording...</span>
              </div>
            ) : (
              <div
                className="shortcut-display"
                onClick={() => setIsRecording(true)}
              >
                {globalShortcut ? (
                  <span className="shortcut-keys">{formatDisplayShortcut(globalShortcut)}</span>
                ) : (
                  <span className="shortcut-placeholder">Not set</span>
                )}
              </div>
            )}
            {globalShortcut && !isRecording && (
              <button
                className="btn-secondary-sm"
                onClick={handleClearShortcut}
              >
                Clear
              </button>
            )}
            {!isRecording && !globalShortcut && (
              <button
                className="btn-secondary-sm"
                onClick={() => setIsRecording(true)}
              >
                Record
              </button>
            )}
            {isRecording && (
              <button
                className="btn-secondary-sm"
                onClick={() => setIsRecording(false)}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
