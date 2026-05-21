import { useState } from 'react';

export default function AddRecipeModal({ collections, onClose, onSave }) {
  const [tab, setTab] = useState('import');
  const [json, setJson] = useState('');
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editTags, setEditTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('All Recipes');

  const handleParse = () => {
    setError('');
    try {
      const m = json.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('No JSON object found. Make sure to copy the full block.');
      const rec = JSON.parse(m[0]);
      if (!rec.title && !rec.ingredients) throw new Error("This doesn't look like a recipe JSON.");
      setRecipe(rec);
      setEditTags(rec.tags || []);
    } catch (e) {
      setError('Could not parse JSON: ' + e.message);
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

  const removeTag = tag => setEditTags(prev => prev.filter(t => t !== tag));
  const addTag = () => {
    const t = newTag.trim().toLowerCase();
    if (t && !editTags.includes(t)) setEditTags(prev => [...prev, t]);
    setNewTag('');
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2>Add Recipe</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--tag-bg)', borderRadius: 8, padding: 3, marginBottom: 18 }}>
            {['import', 'howto'].map(t => (
              <button key={t} onClick={() => { setTab(t); setRecipe(null); setError(''); }}
                style={{ flex: 1, padding: '6px', border: 'none', borderRadius: 6, fontSize: 12, fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all .15s', background: tab === t ? 'white' : 'transparent', color: tab === t ? 'var(--text)' : 'var(--text-muted)', fontWeight: tab === t ? 500 : 400 }}>
                {t === 'import' ? 'Paste JSON' : 'How to get JSON'}
              </button>
            ))}
          </div>

          {tab === 'howto' && (
            <>
              <div style={{ background: 'var(--accent-light)', border: '1px solid #E8C4A8', borderRadius: 8, padding: '14px 16px', fontSize: 13, color: '#7A3A18', lineHeight: 1.7, marginBottom: 16 }}>
                <strong style={{ display: 'block', marginBottom: 6 }}>Free extraction via Claude chat</strong>
                1. Open your Claude conversation<br />
                2. Paste a recipe URL and say:<br />
                <em style={{ display: 'block', margin: '6px 0', padding: '6px 10px', background: 'rgba(196,98,45,0.1)', borderRadius: 5 }}>"Extract this recipe for my vault"</em>
                3. Claude returns a JSON block<br />
                4. Copy it, switch to "Paste JSON" tab, import
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Works with any public recipe site. Claude handles all the extraction — no API key needed.
              </div>
            </>
          )}

          {tab === 'import' && !recipe && (
            <>
              {error && <div className="error-msg">{error}</div>}
              <div className="form-group">
                <label className="form-label">JSON from Claude</label>
                <textarea
                  className="form-textarea"
                  style={{ fontFamily: 'monospace', fontSize: 11, minHeight: 140, lineHeight: 1.5 }}
                  value={json}
                  onChange={e => setJson(e.target.value)}
                  placeholder={'{"title":"...","ingredients":[...],"steps":[...],...}'}
                  autoFocus
                />
                <div className="form-hint">
                  Paste the full JSON block returned by Claude. <button onClick={() => setTab('howto')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, padding: 0 }}>How does this work?</button>
                </div>
              </div>
              <div className="btn-row">
                <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" onClick={handleParse} disabled={!json.trim()}>Import Recipe →</button>
              </div>
            </>
          )}

          {tab === 'import' && recipe && (
            <>
              {recipe.image_url && (
                <img src={recipe.image_url} alt={recipe.title}
                  style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 14 }}
                  onError={e => e.target.style.display = 'none'} />
              )}
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, marginBottom: 6 }}>{recipe.title}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                {recipe.total_time && <span>⏱ {recipe.total_time}</span>}
                {recipe.servings && <span>🍽 {recipe.servings}</span>}
                <span>📋 {recipe.ingredients?.length || 0} ingredients · {recipe.steps?.length || 0} steps</span>
              </div>

              <div className="form-group">
                <label className="form-label">Tags</label>
                <div className="tag-input-row">
                  {editTags.map(tag => (
                    <span key={tag} className="tag-pill">
                      {tag}<button onClick={() => removeTag(tag)}>×</button>
                    </span>
                  ))}
                  <input className="tag-add-input" value={newTag} onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
                    placeholder="+ add tag" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Save to Collection</label>
                <select className="form-select" value={selectedCollection} onChange={e => setSelectedCollection(e.target.value)}>
                  {collections.filter(c => c !== 'Favorites').map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {error && <div className="error-msg">{error}</div>}

              <div className="btn-row">
                <button className="btn btn-secondary" onClick={() => { setRecipe(null); setError(''); }}>← Back</button>
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
