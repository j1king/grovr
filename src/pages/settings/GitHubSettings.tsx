import { useState, useEffect } from 'react';
import { Trash2, ExternalLink, Check, Loader2 } from 'lucide-react';
import * as api from '@/lib/api';
import type { GitHubConfig } from '@/lib/api';

export function GitHubSettings() {
  const [config, setConfig] = useState<GitHubConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [configType, setConfigType] = useState<'personal' | 'enterprise'>('personal');
  const [token, setToken] = useState('');
  const [host, setHost] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const result = await api.getGitHubConfig();
      setConfig(result);
    } catch (err) {
      console.error('Failed to load GitHub config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setError('');
    setTestResult(null);
    setTesting(true);

    try {
      const testConfig: GitHubConfig = {
        config_type: configType,
        token: token.trim(),
        host: configType === 'enterprise' ? host.trim() : undefined,
      };

      const result = await api.validateGitHubToken(testConfig);

      if (result.valid) {
        setTestResult({ valid: true, message: `Connected as ${result.username}` });
      } else {
        setTestResult({ valid: false, message: result.error || 'Invalid token' });
      }
    } catch (err) {
      setTestResult({ valid: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);

    try {
      const newConfig: GitHubConfig = {
        config_type: configType,
        token: token.trim(),
        host: configType === 'enterprise' ? host.trim() : undefined,
      };

      // Validate first
      const result = await api.validateGitHubToken(newConfig);
      if (!result.valid) {
        setError(result.error || 'Invalid token');
        setSaving(false);
        return;
      }

      newConfig.username = result.username;
      await api.setGitHubConfig(newConfig);
      setConfig(newConfig);
      setShowForm(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    try {
      await api.removeGitHubConfig();
      setConfig(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const resetForm = () => {
    setConfigType('personal');
    setToken('');
    setHost('');
    setError('');
    setTestResult(null);
  };

  const maskToken = (t: string) => {
    if (t.length <= 8) return '••••••••';
    return `${t.slice(0, 4)}...${t.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="settings-section">
        <div className="settings-group first">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Loader2 size={12} className="animate-spin" />
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-section">
      <div className="settings-group first">
        {/* Existing connection */}
        {config && !showForm && (
          <div className="integration-list">
            <div className="integration-card">
              <div className="integration-header">
                <div className="integration-info">
                  <span className="integration-name">
                    {config.username || (config.config_type === 'enterprise' ? 'Enterprise' : 'Personal')}
                  </span>
                  <span className="integration-badge">
                    {config.config_type === 'enterprise' ? config.host : 'github.com'}
                  </span>
                </div>
                <div className="integration-status connected">
                  <Check size={10} />
                  Connected
                </div>
              </div>
              <div className="integration-token">{maskToken(config.token)}</div>
              <div className="integration-actions">
                <button className="btn-ghost btn-danger" onClick={handleRemove}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit form */}
        {(showForm || !config) && (
          <div className="space-y-3">
            {/* Type selector - right aligned */}
            <div className="settings-item">
              <div className="settings-item-info">
                <label className="settings-label">Account Type</label>
              </div>
              <select
                className="settings-select"
                value={configType}
                onChange={(e) => setConfigType(e.target.value as 'personal' | 'enterprise')}
              >
                <option value="personal">Personal (github.com)</option>
                <option value="enterprise">GitHub Enterprise</option>
              </select>
            </div>

            {/* Enterprise host */}
            {configType === 'enterprise' && (
              <div className="settings-item-full">
                <label className="settings-label">Host</label>
                <input
                  type="text"
                  className="settings-input"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="github.company.com"
                />
              </div>
            )}

            {/* Token */}
            <div className="settings-item-full">
              <label className="settings-label">Personal Access Token</label>
              <input
                type="password"
                className="settings-input font-mono"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <div className="flex justify-end mt-1">
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="integration-help-link"
                >
                  Create Personal Access Token
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>

            {/* Test result */}
            {testResult && (
              <div className={`text-xs ${testResult.valid ? 'text-green-500' : 'text-red-500'}`}>
                {testResult.message}
              </div>
            )}

            {error && <div className="text-xs text-red-500">{error}</div>}

            <div className="flex gap-2">
              {config && (
                <button
                  type="button"
                  className="btn-secondary-sm"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                className="btn-secondary-sm"
                onClick={handleTest}
                disabled={!token.trim() || (configType === 'enterprise' && !host.trim()) || testing}
              >
                {testing ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test'
                )}
              </button>
              <button
                type="button"
                className="btn-primary-sm"
                onClick={handleSave}
                disabled={!token.trim() || (configType === 'enterprise' && !host.trim()) || saving}
              >
                {saving ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Change account button */}
        {config && !showForm && (
          <button
            className="btn-secondary-sm"
            onClick={() => setShowForm(true)}
          >
            Change Account
          </button>
        )}

      </div>
    </div>
  );
}
