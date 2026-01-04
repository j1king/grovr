import { useState, useEffect } from 'react';
import { ExternalLink, Check, Loader2, Plus } from 'lucide-react';
import * as api from '@/lib/api';
import type { JiraConfig, JiraConfigMeta } from '@/lib/api';

export function JiraSettings() {
  const [config, setConfig] = useState<JiraConfigMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Host form state
  const [hostInput, setHostInput] = useState('');
  const [savingHost, setSavingHost] = useState(false);

  // Credentials form state
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);

  // Extract hostname from full URL
  const extractHost = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return trimmed;
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      return url.hostname;
    } catch {
      return trimmed;
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const result = await api.getJiraConfig();
      setConfig(result);
      if (result?.host) {
        setHostInput(result.host);
      }
    } catch (err) {
      console.error('Failed to load Jira config:', err);
    } finally {
      setLoading(false);
    }
  };

  // Save host
  const handleSaveHost = async () => {
    const host = extractHost(hostInput);

    // Update input with parsed host
    if (host !== hostInput) {
      setHostInput(host);
    }

    if (!host) return;

    // If host didn't change, do nothing
    if (config?.host === host) return;

    setError('');
    setSavingHost(true);

    try {
      const newConfig: JiraConfig = {
        host,
        email: config?.email,
        display_name: config?.display_name,
      };
      await api.setJiraConfig(newConfig);
      setConfig({ ...config, host });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingHost(false);
    }
  };

  // Test credentials
  const handleTestCredentials = async () => {
    if (!config?.host || !email.trim() || !apiToken.trim()) return;

    setError('');
    setTesting(true);
    setTestResult(null);

    try {
      const testConfig: JiraConfig = {
        host: config.host,
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

  // Save credentials (email + token)
  const handleSaveCredentials = async () => {
    console.log('[Jira Save] Starting save, host:', config?.host, 'email:', email, 'tokenLen:', apiToken.length);
    if (!config?.host || !email.trim() || !apiToken.trim()) {
      console.log('[Jira Save] Validation failed - missing required fields');
      return;
    }

    setError('');
    setSavingCredentials(true);

    try {
      const newConfig: JiraConfig = {
        host: config.host,
        email: email.trim(),
        api_token: apiToken.trim(),
      };
      console.log('[Jira Save] Config to save:', { ...newConfig, api_token: `[${newConfig.api_token?.length} chars]` });

      // Validate credentials if not already tested
      if (!testResult?.valid) {
        console.log('[Jira Save] Validating credentials...');
        const result = await api.validateJiraCredentials(newConfig);
        if (!result.valid) {
          setTestResult({ valid: false, message: result.error || 'Invalid credentials' });
          setSavingCredentials(false);
          return;
        }
        newConfig.display_name = result.username;
      } else {
        console.log('[Jira Save] Skipping validation (already tested)');
      }

      console.log('[Jira Save] Calling setJiraConfig...');
      await api.setJiraConfig(newConfig);
      console.log('[Jira Save] Success!');
      setConfig({ host: config.host, email: email.trim(), display_name: newConfig.display_name, has_token: true });
      setShowCredentialsForm(false);
      setEmail('');
      setApiToken('');
      setTestResult(null);
    } catch (err) {
      console.error('[Jira Save] Error:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleRemoveCredentials = async () => {
    if (!config?.host) return;

    try {
      // Save with host only (removes credentials)
      const newConfig: JiraConfig = { host: config.host };
      await api.setJiraConfig(newConfig);
      setConfig({ host: config.host, has_token: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
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

  const isConnected = !!config?.email;

  return (
    <div className="settings-section">
      {/* Section 1: Host */}
      <div className="settings-group first">
        <h4 className="settings-group-title">Host</h4>
        <p className="settings-group-description">
          Set your Jira host to enable issue links in worktrees.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            className="settings-input flex-1"
            value={hostInput}
            onChange={(e) => setHostInput(e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = e.clipboardData.getData('text');
              const host = extractHost(pasted);
              setHostInput(host);
            }}
            placeholder="your-company.atlassian.net"
            onKeyDown={(e) => e.key === 'Enter' && handleSaveHost()}
            onBlur={handleSaveHost}
          />
          {savingHost && <Loader2 size={14} className="animate-spin text-muted-foreground self-center" />}
        </div>
      </div>

      {/* Section 2: API Credentials (only show if host is set) */}
      {config?.host && (
        <div className="settings-group">
          <h4 className="settings-group-title">API Credentials</h4>
          <p className="settings-group-description">
            Add credentials to fetch issue status. Without this, only links will work.
          </p>

          {isConnected && !showCredentialsForm ? (
            <div className="integration-card">
              <div className="integration-info flex-1 min-w-0">
                <span className="integration-name">{config.display_name || config.email}</span>
                <span className="integration-token">{config.email}</span>
              </div>
              <div className="integration-status connected">
                <Check size={10} />
                Connected
              </div>
              <button
                className="btn-secondary-sm btn-danger-text"
                onClick={handleRemoveCredentials}
              >
                Remove
              </button>
            </div>
          ) : showCredentialsForm ? (
            <div className="space-y-3">
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

              {testResult && (
                <div className={`text-xs ${testResult.valid ? 'text-green-500' : 'text-red-500'}`}>
                  {testResult.message}
                </div>
              )}
              {error && <div className="text-xs text-red-500">{error}</div>}

              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary-sm"
                  onClick={() => {
                    setShowCredentialsForm(false);
                    setEmail('');
                    setApiToken('');
                    setTestResult(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-secondary-sm"
                  onClick={handleTestCredentials}
                  disabled={!email.trim() || !apiToken.trim() || testing}
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
                  onClick={handleSaveCredentials}
                  disabled={!email.trim() || !apiToken.trim() || savingCredentials}
                >
                  {savingCredentials ? (
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
          ) : (
            <button
              type="button"
              className="btn-secondary-sm"
              onClick={() => setShowCredentialsForm(true)}
            >
              <Plus size={12} />
              Add Credentials
            </button>
          )}
        </div>
      )}

    </div>
  );
}
