import { useState, useEffect } from 'react';
import * as api from '@/lib/api';
import type { IDEPreset } from '@/types';

const ideOptions: { id: IDEPreset; name: string }[] = [
  { id: 'code', name: 'VS Code' },
  { id: 'cursor', name: 'Cursor' },
  { id: 'idea', name: 'IntelliJ IDEA' },
  { id: 'webstorm', name: 'WebStorm' },
  { id: 'pycharm', name: 'PyCharm' },
  { id: 'goland', name: 'GoLand' },
  { id: 'custom', name: 'Custom' },
];

export function IDESettings() {
  const [selectedIDE, setSelectedIDE] = useState<IDEPreset>('code');
  const [customCommand, setCustomCommand] = useState('');
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await api.getSettings();
      if (settings.ide) {
        setSelectedIDE((settings.ide.preset as IDEPreset) || 'code');
        setCustomCommand(settings.ide.custom_command || '');
      }
      setSkipConfirm(settings.skip_open_ide_confirm ?? false);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleIDEChange = async (preset: IDEPreset) => {
    setSelectedIDE(preset);
    try {
      await api.setIde({
        type: preset === 'custom' ? 'custom' : 'preset',
        preset,
        custom_command: preset === 'custom' ? customCommand : undefined,
      });
    } catch (err) {
      console.error('Failed to save IDE setting:', err);
    }
  };

  const handleCustomCommandChange = (value: string) => {
    setCustomCommand(value);
  };

  const handleCustomCommandBlur = async () => {
    if (selectedIDE === 'custom') {
      try {
        await api.setIde({
          type: 'custom',
          preset: 'custom',
          custom_command: customCommand,
        });
      } catch (err) {
        console.error('Failed to save custom command:', err);
      }
    }
  };

  const handleSkipConfirm = async (skip: boolean) => {
    setSkipConfirm(skip);
    try {
      await api.setSkipOpenIdeConfirm(skip);
    } catch (err) {
      console.error('Failed to save skip confirm:', err);
      setSkipConfirm(!skip);
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
        <div className="settings-item">
          <div className="settings-item-info">
            <label className="settings-label">Default IDE</label>
          </div>
          <select
            className="settings-select"
            value={selectedIDE}
            onChange={(e) => handleIDEChange(e.target.value as IDEPreset)}
          >
            {ideOptions.map((ide) => (
              <option key={ide.id} value={ide.id}>{ide.name}</option>
            ))}
          </select>
        </div>

        {selectedIDE === 'custom' && (
          <div className="settings-item-full">
            <label className="settings-label">Custom Command</label>
            <p className="settings-hint">
              Use <code>{'{path}'}</code> as placeholder
            </p>
            <input
              type="text"
              className="settings-input mt-1.5"
              placeholder="/usr/local/bin/my-ide {path}"
              value={customCommand}
              onChange={(e) => handleCustomCommandChange(e.target.value)}
              onBlur={handleCustomCommandBlur}
            />
          </div>
        )}

        {/* Skip IDE Confirmation */}
        <div className="settings-item">
          <div className="settings-item-info">
            <label className="settings-label">Skip confirmation</label>
            <p className="settings-hint">
              Open IDE directly without asking for confirmation
            </p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={skipConfirm}
              onChange={(e) => handleSkipConfirm(e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>
    </div>
  );
}
