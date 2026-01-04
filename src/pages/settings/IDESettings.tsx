import { useState } from 'react';
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

  return (
    <div className="settings-section">
      <h2 className="settings-title">IDE</h2>

      <div className="settings-group">
        <div className="settings-item">
          <div className="settings-item-info">
            <label className="settings-label">Default IDE</label>
          </div>
          <select
            className="settings-select"
            value={selectedIDE}
            onChange={(e) => setSelectedIDE(e.target.value as IDEPreset)}
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
              onChange={(e) => setCustomCommand(e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
