import { Save } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="fade-up">
      <div className="page-header">
        <div className="page-header-info">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Platform configuration and integrations</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* WhatsApp / DoubleTick */}
        <div className="card">
          <h3 style={{ marginBottom: '4px' }}>WhatsApp Integration</h3>
          <p className="text-sm text-muted" style={{ marginBottom: '20px' }}>
            Configure DoubleTick webhook and WhatsApp Business credentials
          </p>
          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label" htmlFor="setting-dt-api-key">DoubleTick API Key</label>
              <input id="setting-dt-api-key" type="password" className="form-input" placeholder="dt_live_••••••••••••" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="setting-waba-id">WhatsApp Business Account ID</label>
              <input id="setting-waba-id" type="text" className="form-input" placeholder="1234567890" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="setting-webhook-url">Webhook URL (read-only)</label>
              <input
                id="setting-webhook-url"
                type="text"
                className="form-input"
                defaultValue="https://api.nippontoyota.in/api/v1/whatsapp/webhook"
                readOnly
                style={{ color: 'var(--text-muted)', cursor: 'default' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="setting-webhook-secret">Webhook Secret</label>
              <input id="setting-webhook-secret" type="password" className="form-input" placeholder="••••••••••••" />
            </div>
          </div>
        </div>

        {/* Company */}
        <div className="card">
          <h3 style={{ marginBottom: '4px' }}>Company Profile</h3>
          <p className="text-sm text-muted" style={{ marginBottom: '20px' }}>
            Basic company information used across the platform
          </p>
          <div className="grid-cols-2">
            <div className="form-group">
              <label className="form-label" htmlFor="setting-company-name">Company Name</label>
              <input id="setting-company-name" type="text" className="form-input" defaultValue="Nippon Toyota Motor India" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="setting-hr-email">HR Contact Email</label>
              <input id="setting-hr-email" type="email" className="form-input" placeholder="hr@nippontoyota.com" />
            </div>
          </div>
        </div>

        {/* Save */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button id="btn-save-settings" className="btn btn-primary">
            <Save size={15} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
