import { useState } from 'react';

export function AppearanceSettings() {
  const [mode, setMode] = useState<'system' | 'light' | 'dark'>('system');

  return (
    <div className="settings-section">
      <h2 className="settings-title">Appearance</h2>

      <div className="settings-group">
        <div className="settings-item">
          <div className="settings-item-info">
            <label className="settings-label">Mode</label>
            <p className="settings-hint">Choose between light and dark mode</p>
          </div>
          <select
            className="settings-select"
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
    </div>
  );
}
