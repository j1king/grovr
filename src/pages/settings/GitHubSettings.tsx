import { Plus, Trash2, ExternalLink, Check } from 'lucide-react';

export function GitHubSettings() {
  return (
    <div className="settings-section">
      <h2 className="settings-title">GitHub</h2>

      <div className="settings-group">
        <div className="integration-list">
          <div className="integration-card">
            <div className="integration-header">
              <div className="integration-info">
                <span className="integration-name">Personal</span>
                <span className="integration-badge">github.com</span>
              </div>
              <div className="integration-status connected">
                <Check size={10} />
                Connected
              </div>
            </div>
            <div className="integration-token">ghp_xxxx...xxxx</div>
            <div className="integration-actions">
              <button className="btn-ghost btn-danger">
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          <div className="integration-card">
            <div className="integration-header">
              <div className="integration-info">
                <span className="integration-name">Work</span>
                <span className="integration-badge">github.company.com</span>
              </div>
              <div className="integration-status connected">
                <Check size={10} />
                Connected
              </div>
            </div>
            <div className="integration-token">ghp_yyyy...yyyy</div>
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
  );
}
