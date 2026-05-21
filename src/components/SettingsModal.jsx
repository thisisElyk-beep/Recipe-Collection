import { useState } from 'react';

const EXAMPLE_CONFIG = `{
  "apiKey": "AIzaSy...",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project-id",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "123456789",
  "appId": "1:123456789:web:abc123"
}`;

export default function SettingsModal({ onClose, onSave, canClose }) {
  const [claudeKey, setClaudeKey] = useState(localStorage.getItem('claude_api_key') || '');
  const [firebaseConfig, setFirebaseConfig] = useState(localStorage.getItem('firebase_config') || '');
  const [error, setError] = useState('');

  const handleSave = () => {
    setError('');

    if (!claudeKey.trim()) { setError('Anthropic API key is required.'); return; }
    if (!firebaseConfig.trim()) { setError('Firebase config JSON is required.'); return; }

    try {
      JSON.parse(firebaseConfig);
    } catch {
      setError('Firebase config is not valid JSON. Check the format.'); return;
    }

    localStorage.setItem('claude_api_key', claudeKey.trim());
    localStorage.setItem('firebase_config', firebaseConfig.trim());
    onSave();
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && canClose) onClose(); }}>
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <h2>Settings</h2>
          {canClose && <button className="modal-close" onClick={onClose}>×</button>}
        </div>
        <div className="modal-body">
          {!canClose && (
            <div style={{ background: 'var(--accent-light)', border: '1px solid #E8C4A8', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#7A3A18', marginBottom: 20 }}>
              Welcome! Connect your API keys to get started. These are stored locally in your browser only.
            </div>
          )}

          <div className="settings-section-title">Anthropic API Key</div>
          <div className="form-group">
            <input
              className="form-input"
              type="password"
              value={claudeKey}
              onChange={e => setClaudeKey(e.target.value)}
              placeholder="sk-ant-api03-…"
            />
            <div className="form-hint">
              Get yours at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>console.anthropic.com</a>.
              Used to extract recipes from URLs. Stored locally in your browser.
            </div>
          </div>

          <div className="settings-section-title">Firebase Configuration</div>
          <div className="form-group">
            <div className="form-hint" style={{ marginBottom: 8 }}>
              Create a Firestore database at <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>console.firebase.google.com</a>,
              then paste your web app config JSON below. Make sure Firestore security rules allow read/write.
            </div>
            <div className="config-code" style={{ fontSize: 11, marginBottom: 8 }}>{`// Recommended Firestore rules (for personal use):
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // lock down for production
    }
  }
}`}</div>
            <label className="form-label">Firebase Config JSON</label>
            <textarea
              className="form-textarea"
              style={{ fontFamily: 'monospace', fontSize: 12, minHeight: 160 }}
              value={firebaseConfig}
              onChange={e => setFirebaseConfig(e.target.value)}
              placeholder={EXAMPLE_CONFIG}
              spellCheck={false}
            />
          </div>

          {error && <div className="error-msg">{error}</div>}

          <div className="btn-row">
            {canClose && <button className="btn btn-secondary" onClick={onClose}>Cancel</button>}
            <button className="btn btn-primary" onClick={handleSave}>
              Save & Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
