import { useState, useEffect } from 'react';
import * as api from '@/lib/api';

export function GeneralSettings() {
  const [launchAtStartup, setLaunchAtStartup] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState<string>('5');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await api.getSettings();
      setLaunchAtStartup(settings.launch_at_startup ?? false);
      setAutoRefresh(settings.refresh_interval_minutes === 0 ? 'off' : String(settings.refresh_interval_minutes));
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
      </div>
    </div>
  );
}
