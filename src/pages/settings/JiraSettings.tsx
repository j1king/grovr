import { Plus, Trash2, ExternalLink, Check } from 'lucide-react';

export function JiraSettings() {
  return (
    <div className="settings-section">
      <div className="settings-group first">
        <div className="integration-list">
          <div className="integration-card">
            <div className="integration-header">
              <div className="integration-info">
                <span className="integration-name">Company Jira</span>
                <span className="integration-badge">company.atlassian.net</span>
              </div>
              <div className="integration-status connected">
                <Check size={10} />
                Connected
              </div>
            </div>
            <div className="integration-token">john@company.com</div>
            <div className="integration-actions">
              <button className="btn-ghost btn-danger">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>

        <button className="btn-secondary-sm">
          <Plus size={14} />
          Add Account
        </button>

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
  );
}
