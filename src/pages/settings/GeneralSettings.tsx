import { useState } from 'react';

export function GeneralSettings() {
  const [launchAtStartup, setLaunchAtStartup] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState<string>('5');
  const [skipConfirm, setSkipConfirm] = useState(false);

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
              onChange={(e) => setLaunchAtStartup(e.target.checked)}
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
            onChange={(e) => setAutoRefresh(e.target.value)}
          >
            <option value="off">Off</option>
            <option value="1">1 minute</option>
            <option value="5">5 minutes</option>
            <option value="10">10 minutes</option>
            <option value="30">30 minutes</option>
          </select>
        </div>

        {/* Skip IDE Confirmation */}
        <div className="settings-item">
          <div className="settings-item-info">
            <label className="settings-label">Skip Open IDE confirmation</label>
            <p className="settings-hint">
              Open IDE directly without asking for confirmation
            </p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={skipConfirm}
              onChange={(e) => setSkipConfirm(e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>
    </div>
  );
}
