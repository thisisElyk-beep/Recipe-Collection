import { useState, useRef } from 'react';
import { uploadRecipeImage } from '../lib/firebase';

export default function AddRecipeModal({ collections, onClose, onSave }) {
  const [tab, setTab] = useState('import');
  const [json, setJson] = useState('');
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editTags, setEditTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('All Recipes');
  const [imageUrl, setImageUrl] = useState('');
  const [imgError, setImgError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageMode, setImageMode] = useState('url'); // 'url' | 'upload'
  const fileRef = useRef();

  const handleParse = () => {
    setError('');
    try {
      const m = json.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('No JSON object found. Make sure to copy the full block.');
      const rec = JSON.parse(m[0]);
      if (!rec.title && !rec.ingredients) throw new Error("This doesn't look like a recipe JSON.");
      setRecipe(rec);
      setEditTags(rec.tags || []);
      setImageUrl(rec.image_url || '');
      setImgError(false);
    } catch (e) {
      setError('Could not parse JSON: ' + e.message);
    }
  };

  const handleFileSelect = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10MB.'); return; }
    setError('');
    setUploading(true);
    setUploadProgress(0);
    try {
      const url = await uploadRecipeImage(file, pct => setUploadProgress(pct));
      setImageUrl(url);
      setImgError(false);
    } catch (e) {
      setError('Upload failed: ' + e.message + '. Make sure Firebase Storage is enabled.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ ...recipe, tags: editTags, collection: selectedCollection, image_url: imageUrl || null });
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

  const clearImage = () => { setImageUrl(''); setImgError(false); };

  const unsplashUrl = recipe
    ? `https://unsplash.com/s/photos/${encodeURIComponent(recipe.title)}`
    : 'https://unsplash.com';

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
            <div style={{ background: 'var(--accent-light)', border: '1px solid #E8C4A8', borderRadius: 8, padding: '14px 16px', fontSize: 13, color: '#7A3A18', lineHeight: 1.7 }}>
              <strong style={{ display: 'block', marginBottom: 6 }}>Free extraction via Claude chat</strong>
              1. Paste a recipe URL in this Claude chat<br />
              2. Say: <em>"Extract this recipe for my vault"</em><br />
              3. Copy the JSON block Claude returns<br />
              4. Switch to "Paste JSON" tab and import
            </div>
          )}

          {tab === 'import' && !recipe && (
            <>
              {error && <div className="error-msg">{error}</div>}
              <div className="form-group">
                <label className="form-label">JSON from Claude</label>
                <textarea className="form-textarea"
                  style={{ fontFamily: 'monospace', fontSize: 11, minHeight: 140, lineHeight: 1.5 }}
                  value={json} onChange={e => setJson(e.target.value)}
                  placeholder={'{"title":"...","ingredients":[...],"steps":[...],...}'}
                  autoFocus />
              </div>
              <div className="btn-row">
                <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" onClick={handleParse} disabled={!json.trim()}>Import Recipe →</button>
              </div>
            </>
          )}

          {tab === 'import' && recipe && (
            <>
              {/* ── Image section ── */}
              <div className="form-group">
                <label className="form-label">Photo</label>

                {imageUrl && !imgError ? (
                  /* Preview */
                  <div style={{ position: 'relative', marginBottom: 4 }}>
                    <img src={imageUrl} alt={recipe.title}
                      style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, display: 'block' }}
                      onError={() => setImgError(true)} />
                    <button onClick={clearImage}
                      style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 26, height: 26, color: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ×
                    </button>
                  </div>
                ) : (
                  /* No image — upload or URL */
                  <div style={{ background: 'var(--tag-bg)', borderRadius: 8, border: '1px dashed var(--border)', overflow: 'hidden', marginBottom: 4 }}>
                    {/* Mode toggle */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                      {[['upload','Upload File'],['url','Paste URL']].map(([mode, label]) => (
                        <button key={mode} onClick={() => setImageMode(mode)}
                          style={{ flex: 1, padding: '8px', border: 'none', background: imageMode === mode ? 'white' : 'transparent', color: imageMode === mode ? 'var(--text)' : 'var(--text-muted)', fontSize: 11, fontWeight: imageMode === mode ? 500 : 400, fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all .15s' }}>
                          {label}
                        </button>
                      ))}
                    </div>

                    <div style={{ padding: '14px 16px' }}>
                      {imageMode === 'upload' ? (
                        <>
                          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={e => handleFileSelect(e.target.files[0])} />

                          {uploading ? (
                            <div style={{ textAlign: 'center', padding: '8px 0' }}>
                              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 8 }}>
                                <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.2s' }} />
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Uploading… {uploadProgress}%</div>
                            </div>
                          ) : (
                            <div
                              onClick={() => fileRef.current?.click()}
                              onDragOver={e => e.preventDefault()}
                              onDrop={e => { e.preventDefault(); handleFileSelect(e.dataTransfer.files[0]); }}
                              style={{ textAlign: 'center', cursor: 'pointer', padding: '8px 0' }}>
                              <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
                              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>Click to upload or drag & drop</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>JPG, PNG, WEBP up to 10MB</div>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
                            Paste an image URL, or{' '}
                            <a href={unsplashUrl} target="_blank" rel="noopener noreferrer"
                              style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                              search Unsplash ↗
                            </a>
                            {' '}(right-click photo → Copy image address)
                          </div>
                          <input className="form-input" style={{ marginBottom: 0 }} type="url"
                            value={imageUrl} onChange={e => { setImageUrl(e.target.value); setImgError(false); }}
                            placeholder="https://..." />
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, marginBottom: 4 }}>{recipe.title}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                {recipe.total_time && <span>⏱ {recipe.total_time}</span>}
                {recipe.servings && <span>🍽 {recipe.servings}</span>}
                <span>📋 {(recipe.ingredients||[]).length} ingredients · {(recipe.steps||[]).length} steps</span>
              </div>
              {recipe.description && <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 10, lineHeight: 1.5 }}>{recipe.description}</p>}

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
                <button className="btn btn-primary" onClick={handleSave} disabled={saving || uploading}>
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
