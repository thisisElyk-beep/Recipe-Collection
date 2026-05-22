import { useState } from 'react';

const EMPTY_INGREDIENT = () => ({ id: Date.now() + Math.random(), amount: '', unit: '', item: '', note: '' });
const EMPTY_STEP = () => ({ id: Date.now() + Math.random(), instruction: '' });

function CreateForm({ collections, onClose, onSave }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('All Recipes');
  const [imageUrl, setImageUrl] = useState('');
  const [imgError, setImgError] = useState(false);
  const [newTag, setNewTag] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    prep_time: '',
    cook_time: '',
    total_time: '',
    servings: '',
    tags: [],
    source_url: '',
  });

  const [ingredients, setIngredients] = useState([EMPTY_INGREDIENT()]);
  const [steps, setSteps] = useState([EMPTY_STEP()]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Ingredients
  const updateIng = (id, k, v) => setIngredients(prev => prev.map(i => i.id === id ? { ...i, [k]: v } : i));
  const addIng = () => setIngredients(prev => [...prev, EMPTY_INGREDIENT()]);
  const removeIng = (id) => setIngredients(prev => prev.filter(i => i.id !== id));

  // Steps
  const updateStep = (id, v) => setSteps(prev => prev.map(s => s.id === id ? { ...s, instruction: v } : s));
  const addStep = () => setSteps(prev => [...prev, EMPTY_STEP()]);
  const removeStep = (id) => setSteps(prev => prev.filter(s => s.id !== id));

  // Tags
  const addTag = () => {
    const t = newTag.trim().toLowerCase();
    if (t && !form.tags.includes(t)) setField('tags', [...form.tags, t]);
    setNewTag('');
  };
  const removeTag = (t) => setField('tags', form.tags.filter(x => x !== t));

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const recipe = {
        ...form,
        image_url: imageUrl || null,
        collection: selectedCollection,
        ingredients: ingredients
          .filter(i => i.item.trim())
          .map((ing, idx) => ({ amount: ing.amount, unit: ing.unit || null, item: ing.item, note: ing.note || null, number: idx + 1 })),
        steps: steps
          .filter(s => s.instruction.trim())
          .map((s, idx) => ({ number: idx + 1, instruction: s.instruction })),
        source_url: form.source_url || '',
      };
      await onSave(recipe);
      onClose();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '8px 11px', border: '1px solid var(--border)',
    borderRadius: 7, fontSize: 12, fontFamily: 'var(--font-body)',
    color: 'var(--text)', background: 'var(--bg)', outline: 'none',
    transition: 'border-color 0.15s', boxSizing: 'border-box',
  };

  const lbl = (text, required) => (
    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
      {text}{required && <span style={{ color: 'var(--accent)', marginLeft: 2 }}>*</span>}
    </label>
  );

  const rowBtn = (onClick, label, danger) => (
    <button type="button" onClick={onClick} style={{
      background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
      color: danger ? '#C0392B' : 'var(--text-muted)', padding: '4px 6px',
      borderRadius: 5, transition: 'all 0.15s', flexShrink: 0,
      fontFamily: 'var(--font-body)',
    }}>{label}</button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Image */}
      <div>
        {lbl('Photo')}
        {imageUrl && !imgError ? (
          <div style={{ position: 'relative', marginBottom: 4 }}>
            <img src={imageUrl} alt="preview" onError={() => setImgError(true)}
              style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
            <button onClick={() => { setImageUrl(''); setImgError(false); }} style={{
              position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)',
              border: 'none', borderRadius: '50%', width: 26, height: 26, color: 'white',
              cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>×</button>
          </div>
        ) : (
          <input style={inputStyle} type="url" value={imageUrl}
            onChange={e => { setImageUrl(e.target.value); setImgError(false); }}
            placeholder="https://images.unsplash.com/..." />
        )}
      </div>

      {/* Title & Description */}
      <div>
        {lbl('Title', true)}
        <input style={inputStyle} value={form.title} onChange={e => setField('title', e.target.value)} placeholder="e.g. Grandma's Pot Roast" autoFocus />
      </div>

      <div>
        {lbl('Description')}
        <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60, lineHeight: 1.5 }}
          value={form.description} onChange={e => setField('description', e.target.value)}
          placeholder="A brief description of the dish…" />
      </div>

      {/* Times & Servings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
        {[['Prep Time', 'prep_time', '15 min'], ['Cook Time', 'cook_time', '1 hr'], ['Total Time', 'total_time', '1 hr 15 min'], ['Servings', 'servings', '4']].map(([label, key, ph]) => (
          <div key={key}>
            {lbl(label)}
            <input style={inputStyle} value={form[key]} onChange={e => setField(key, e.target.value)} placeholder={ph} />
          </div>
        ))}
      </div>

      {/* Ingredients */}
      <div>
        {lbl('Ingredients')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ingredients.map((ing, idx) => (
            <div key={ing.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', paddingTop: 10, minWidth: 16, textAlign: 'right', flexShrink: 0 }}>{idx + 1}</span>
              <input style={{ ...inputStyle, width: 70 }} value={ing.amount} onChange={e => updateIng(ing.id, 'amount', e.target.value)} placeholder="1 1/2" />
              <input style={{ ...inputStyle, width: 60 }} value={ing.unit} onChange={e => updateIng(ing.id, 'unit', e.target.value)} placeholder="cups" />
              <input style={{ ...inputStyle, flex: 2 }} value={ing.item} onChange={e => updateIng(ing.id, 'item', e.target.value)} placeholder="all-purpose flour" />
              <input style={{ ...inputStyle, flex: 1 }} value={ing.note} onChange={e => updateIng(ing.id, 'note', e.target.value)} placeholder="sifted (optional)" />
              {ingredients.length > 1 && rowBtn(() => removeIng(ing.id), '×', true)}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
            <span style={{ minWidth: 16 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 70, textAlign: 'center' }}>Amount</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 60, textAlign: 'center' }}>Unit</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Ingredient</span>
            </div>
          </div>
        </div>
        <button type="button" onClick={addIng} style={{
          marginTop: 8, fontSize: 12, color: 'var(--accent)', background: 'var(--accent-light)',
          border: '1px solid #E8C4A8', borderRadius: 7, padding: '5px 12px',
          cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500,
        }}>+ Add Ingredient</button>
      </div>

      {/* Steps */}
      <div>
        {lbl('Instructions')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {steps.map((step, idx) => (
            <div key={step.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)',
                color: 'white', fontSize: 11, fontWeight: 600, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 6,
              }}>{idx + 1}</span>
              <textarea
                style={{ ...inputStyle, flex: 1, resize: 'vertical', minHeight: 56, lineHeight: 1.5 }}
                value={step.instruction}
                onChange={e => updateStep(step.id, e.target.value)}
                placeholder={`Step ${idx + 1}…`}
              />
              {steps.length > 1 && rowBtn(() => removeStep(step.id), '×', true)}
            </div>
          ))}
        </div>
        <button type="button" onClick={addStep} style={{
          marginTop: 8, fontSize: 12, color: 'var(--accent)', background: 'var(--accent-light)',
          border: '1px solid #E8C4A8', borderRadius: 7, padding: '5px 12px',
          cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500,
        }}>+ Add Step</button>
      </div>

      {/* Tags */}
      <div>
        {lbl('Tags')}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
          {form.tags.map(t => (
            <span key={t} className="tag-pill">{t}<button onClick={() => removeTag(t)}>×</button></span>
          ))}
          <input className="tag-add-input" value={newTag} onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
            placeholder="+ add tag" />
        </div>
      </div>

      {/* Collection & Source */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          {lbl('Collection')}
          <select className="form-select" value={selectedCollection} onChange={e => setSelectedCollection(e.target.value)}>
            {collections.filter(c => c !== 'Favorites').map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          {lbl('Source URL')}
          <input style={inputStyle} value={form.source_url} onChange={e => setField('source_url', e.target.value)} placeholder="https://… (optional)" />
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="btn-row">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Recipe'}
        </button>
      </div>
    </div>
  );
}

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

  const unsplashUrl = recipe
    ? `https://unsplash.com/s/photos/${encodeURIComponent(recipe.title)}`
    : 'https://unsplash.com';

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: tab === 'create' ? 680 : 460, maxHeight: '92vh' }}>
        <div className="modal-header">
          <h2>Add Recipe</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--tag-bg)', borderRadius: 8, padding: 3, marginBottom: 18 }}>
            {[['import', 'Import from Claude'], ['create', 'Create Recipe'], ['howto', 'How to Import']].map(([t, label]) => (
              <button key={t} onClick={() => { setTab(t); setRecipe(null); setError(''); }}
                style={{ flex: 1, padding: '6px', border: 'none', borderRadius: 6, fontSize: 12, fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all .15s', background: tab === t ? 'white' : 'transparent', color: tab === t ? 'var(--text)' : 'var(--text-muted)', fontWeight: tab === t ? 500 : 400 }}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'howto' && (
            <div style={{ background: 'var(--accent-light)', border: '1px solid #E8C4A8', borderRadius: 8, padding: '14px 16px', fontSize: 13, color: '#7A3A18', lineHeight: 1.7 }}>
              <strong style={{ display: 'block', marginBottom: 6 }}>Free extraction via Claude chat</strong>
              1. Paste a recipe URL in this Claude chat<br />
              2. Say: <em>"Extract this recipe for my vault"</em><br />
              3. Copy the JSON block Claude returns<br />
              4. Switch to "Import from Claude" tab and paste
            </div>
          )}

          {tab === 'create' && (
            <CreateForm collections={collections} onClose={onClose} onSave={onSave} />
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
              <div className="form-group">
                <label className="form-label">Photo</label>
                {imageUrl && !imgError ? (
                  <div style={{ position: 'relative', marginBottom: 4 }}>
                    <img src={imageUrl} alt={recipe.title}
                      style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, display: 'block' }}
                      onError={() => setImgError(true)} />
                    <button onClick={() => { setImageUrl(''); setImgError(false); }}
                      style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 26, height: 26, color: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ×
                    </button>
                  </div>
                ) : (
                  <div style={{ background: 'var(--tag-bg)', borderRadius: 8, border: '1px dashed var(--border)', padding: '14px 16px', marginBottom: 4 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.6 }}>
                      Search{' '}
                      <a href={unsplashUrl} target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>
                        Unsplash for "{recipe.title}" ↗
                      </a>
                      {' '}→ right-click a photo → <strong>Copy image address</strong> → paste below.
                    </div>
                    <input className="form-input" style={{ marginBottom: 0 }} type="url"
                      value={imageUrl}
                      onChange={e => { setImageUrl(e.target.value); setImgError(false); }}
                      placeholder="https://images.unsplash.com/..." />
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
