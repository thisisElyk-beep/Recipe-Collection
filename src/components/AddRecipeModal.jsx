import { useState } from 'react';
import { extractRecipeFromUrl } from '../lib/claude';

const STEPS = { URL: 'url', LOADING: 'loading', PREVIEW: 'preview', ERROR: 'error' };

export default function AddRecipeModal({ collections, onClose, onSave }) {
  const [step, setStep] = useState(STEPS.URL);
  const [url, setUrl] = useState('');
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editTags, setEditTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('All Recipes');

  const handleFetch = async () => {
    if (!url.trim()) return;
    setStep(STEPS.LOADING);
    setError('');
    try {
      const data = await extractRecipeFromUrl(url.trim());
      setRecipe(data);
      setEditTags(data.tags || []);
      setStep(STEPS.PREVIEW);
    } catch (e) {
      setError(e.message);
      setStep(STEPS.ERROR);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ ...recipe, tags: editTags, collection: selectedCollection });
      onClose();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  const removeTag = (tag) => setEditTags(prev => prev.filter(t => t !== tag));
  const addTag = () => {
    const t = newTag.trim().toLowerCase();
    if (t && !editTags.includes(t)) setEditTags(prev => [...prev, t]);
    setNewTag('');
  };

  const [imgError, setImgError] = useState(false);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2>Add Recipe</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          {/* URL Input */}
          {(step === STEPS.URL || step === STEPS.ERROR) && (
            <>
              {step === STEPS.ERROR && <div className="error-msg">{error}</div>}
              <div className="form-group">
                <label className="form-label">Recipe URL</label>
                <input
                  className="form-input"
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleFetch()}
                  placeholder="https://www.seriouseats.com/..."
                  autoFocus
                />
                <div className="form-hint">Paste any recipe page URL — Claude will extract and clean it automatically.</div>
              </div>
              <div className="btn-row">
                <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" onClick={handleFetch} disabled={!url.trim()}>
                  Extract Recipe →
                </button>
              </div>
            </>
          )}

          {/* Loading */}
          {step === STEPS.LOADING && (
            <div className="fetch-state">
              <div className="spinner" />
              <div className="fetch-label">Fetching and extracting recipe…</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>This takes 5–15 seconds</div>
            </div>
          )}

          {/* Preview + Edit */}
          {step === STEPS.PREVIEW && recipe && (
            <>
              {recipe.image_url && !imgError && (
                <img
                  className="preview-img"
                  src={recipe.image_url}
                  alt={recipe.title}
                  onError={() => setImgError(true)}
                />
              )}

              <div className="preview-title">{recipe.title}</div>

              <div className="preview-meta">
                {recipe.total_time && <span>⏱ {recipe.total_time}</span>}
                {recipe.servings && <span>🍽 {recipe.servings}</span>}
                <span>📋 {recipe.ingredients?.length || 0} ingredients</span>
                <span>📝 {recipe.steps?.length || 0} steps</span>
              </div>

              {recipe.description && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 16, lineHeight: 1.5 }}>
                  {recipe.description}
                </p>
              )}

              <div className="form-group">
                <label className="form-label">Tags</label>
                <div className="tag-input-row">
                  {editTags.map(tag => (
                    <span key={tag} className="tag-pill">
                      {tag}
                      <button onClick={() => removeTag(tag)}>×</button>
                    </span>
                  ))}
                  <input
                    className="tag-add-input"
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                    placeholder="+ add tag"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Save to Collection</label>
                <select
                  className="form-select"
                  value={selectedCollection}
                  onChange={e => setSelectedCollection(e.target.value)}
                >
                  {collections.filter(c => c !== 'Favorites').map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              {error && <div className="error-msg">{error}</div>}

              <div className="btn-row">
                <button className="btn btn-secondary" onClick={() => { setStep(STEPS.URL); setError(''); }}>
                  ← Back
                </button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save to Vault'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
