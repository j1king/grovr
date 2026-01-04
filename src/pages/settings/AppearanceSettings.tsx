import { useState, useEffect } from 'react';
import * as api from '@/lib/api';

type ThemeMode = 'system' | 'light' | 'dark';

export function AppearanceSettings() {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await api.getSettings();
      setMode((settings.theme as ThemeMode) || 'system');
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = async (newMode: ThemeMode) => {
    setMode(newMode);
    applyTheme(newMode);
    try {
      await api.setTheme(newMode);
    } catch (err) {
      console.error('Failed to save theme:', err);
    }
  };

  const applyTheme = (theme: ThemeMode) => {
    const root = document.documentElement;

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  };

  // Apply theme on load
  useEffect(() => {
    if (!loading) {
      applyTheme(mode);
    }
  }, [loading, mode]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system');

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode]);

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
        <div className="settings-item">
          <div className="settings-item-info">
            <label className="settings-label">Mode</label>
            <p className="settings-hint">Choose between light and dark mode</p>
          </div>
          <select
            className="settings-select"
            value={mode}
            onChange={(e) => handleModeChange(e.target.value as ThemeMode)}
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
