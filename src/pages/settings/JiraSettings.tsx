import { useState, useEffect } from 'react';
import { Trash2, ExternalLink, Check, Loader2 } from 'lucide-react';
import * as api from '@/lib/api';
import type { JiraConfig } from '@/lib/api';

export function JiraSettings() {
  const [config, setConfig] = useState<JiraConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [host, setHost] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const result = await api.getJiraConfig();
      setConfig(result);
    } catch (err) {
      console.error('Failed to load Jira config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setError('');
    setTestResult(null);
    setTesting(true);

    try {
      const testConfig: JiraConfig = {
        host: host.trim(),
        email: email.trim(),
        api_token: apiToken.trim(),
      };

      const result = await api.validateJiraCredentials(testConfig);

      if (result.valid) {
        setTestResult({ valid: true, message: `Connected as ${result.username}` });
      } else {
        setTestResult({ valid: false, message: result.error || 'Invalid credentials' });
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
      const newConfig: JiraConfig = {
        host: host.trim(),
        email: email.trim(),
        api_token: apiToken.trim(),
      };

      // Validate first
      const result = await api.validateJiraCredentials(newConfig);
      if (!result.valid) {
        setError(result.error || 'Invalid credentials');
        setSaving(false);
        return;
      }

      newConfig.display_name = result.username;
      await api.setJiraConfig(newConfig);
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
      await api.removeJiraConfig();
      setConfig(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const resetForm = () => {
    setHost('');
    setEmail('');
    setApiToken('');
    setError('');
    setTestResult(null);
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
                    {config.display_name || 'Jira'}
                  </span>
                  <span className="integration-badge">{config.host}</span>
                </div>
                <div className="integration-status connected">
                  <Check size={10} />
                  Connected
                </div>
              </div>
              <div className="integration-token">{config.email}</div>
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
            {/* Host */}
            <div className="settings-item-full">
              <label className="settings-label">Jira Host</label>
              <input
                type="text"
                className="settings-input"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="your-company.atlassian.net"
              />
            </div>

            {/* Email */}
            <div className="settings-item-full">
              <label className="settings-label">Email</label>
              <input
                type="email"
                className="settings-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@company.com"
              />
            </div>

            {/* API Token */}
            <div className="settings-item-full">
              <label className="settings-label">API Token</label>
              <input
                type="password"
                className="settings-input font-mono"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Your Jira API token"
              />
              <div className="flex justify-end mt-1">
                <a
                  href="https://id.atlassian.com/manage-profile/security/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="integration-help-link"
                >
                  Create Jira API Token
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
                disabled={!host.trim() || !email.trim() || !apiToken.trim() || testing}
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
                disabled={!host.trim() || !email.trim() || !apiToken.trim() || saving}
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
