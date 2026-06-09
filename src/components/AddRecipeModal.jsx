import { useState } from 'react';
import { scrapeRecipeFromUrl } from '../lib/scraper';

const EMPTY_INGREDIENT = () => ({ id: Date.now() + Math.random(), amount: '', unit: '', item: '', note: '' });
const EMPTY_STEP = () => ({ id: Date.now() + Math.random(), instruction: '' });

// ── Create Recipe Form ────────────────────────────────────────────
function CreateForm({ collections, onClose, onSave }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('All Recipes');
  const [imageUrl, setImageUrl] = useState('');
  const [imgError, setImgError] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [form, setForm] = useState({ title: '', description: '', prep_time: '', cook_time: '', total_time: '', servings: '', tags: [], source_url: '' });
  const [ingredients, setIngredients] = useState([EMPTY_INGREDIENT()]);
  const [steps, setSteps] = useState([EMPTY_STEP()]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const updateIng = (id, k, v) => setIngredients(p => p.map(i => i.id === id ? { ...i, [k]: v } : i));
  const addIng = () => setIngredients(p => [...p, EMPTY_INGREDIENT()]);
  const removeIng = id => setIngredients(p => p.filter(i => i.id !== id));
  const updateStep = (id, v) => setSteps(p => p.map(s => s.id === id ? { ...s, instruction: v } : s));
  const addStep = () => setSteps(p => [...p, EMPTY_STEP()]);
  const removeStep = id => setSteps(p => p.filter(s => s.id !== id));
  const addTag = () => { const t = newTag.trim().toLowerCase(); if (t && !form.tags.includes(t)) setField('tags', [...form.tags, t]); setNewTag(''); };
  const removeTag = t => setField('tags', form.tags.filter(x => x !== t));

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true); setError('');
    try {
      await onSave({ ...form, image_url: imageUrl || null, collection: selectedCollection,
        ingredients: ingredients.filter(i => i.item.trim()).map((ing, idx) => ({ amount: ing.amount, unit: ing.unit || null, item: ing.item, note: ing.note || null, number: idx + 1 })),
        steps: steps.filter(s => s.instruction.trim()).map((s, idx) => ({ number: idx + 1, instruction: s.instruction })),
      });
      onClose();
    } catch (e) { setError(e.message); setSaving(false); }
  };

  const inp = { width: '100%', padding: '8px 11px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text)', background: 'var(--bg)', outline: 'none', boxSizing: 'border-box' };
  const lbl = (text, req) => <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>{text}{req && <span style={{ color: 'var(--accent)', marginLeft: 2 }}>*</span>}</label>;
  const xBtn = (onClick) => <button type="button" onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#C0392B', padding: '2px 6px', borderRadius: 4, fontFamily: 'inherit', flexShrink: 0 }}>×</button>;
  const addBtn = (onClick, label) => <button type="button" onClick={onClick} style={{ marginTop: 8, fontSize: 12, color: 'var(--accent)', background: 'var(--accent-light)', border: '1px solid #E8C4A8', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500 }}>{label}</button>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        {lbl('Photo')}
        {imageUrl && !imgError ? (
          <div style={{ position: 'relative' }}>
            <img src={imageUrl} alt="preview" onError={() => setImgError(true)} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
            <button onClick={() => { setImageUrl(''); setImgError(false); }} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 26, height: 26, color: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        ) : (
          <input style={inp} type="url" value={imageUrl} onChange={e => { setImageUrl(e.target.value); setImgError(false); }} placeholder="https://images.unsplash.com/..." />
        )}
      </div>

      <div>{lbl('Title', true)}<input style={inp} value={form.title} onChange={e => setField('title', e.target.value)} placeholder="e.g. Grandma's Pot Roast" autoFocus /></div>
      <div><textarea style={{ ...inp, resize: 'vertical', minHeight: 60, lineHeight: 1.5 }} value={form.description} onChange={e => setField('description', e.target.value)} placeholder="A brief description…" /></div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
        {[['Prep Time', 'prep_time', '15 min'], ['Cook Time', 'cook_time', '1 hr'], ['Total Time', 'total_time', '1 hr 15 min'], ['Servings', 'servings', '4']].map(([label, key, ph]) => (
          <div key={key}>{lbl(label)}<input style={inp} value={form[key]} onChange={e => setField(key, e.target.value)} placeholder={ph} /></div>
        ))}
      </div>

      <div>
        {lbl('Ingredients')}
        <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 6, marginBottom: 6, paddingLeft: 22 }}>
          <span style={{ width: 70 }}>Amount</span><span style={{ width: 60 }}>Unit</span><span style={{ flex: 2 }}>Ingredient</span><span style={{ flex: 1 }}>Note</span>
        </div>
        {ingredients.map((ing, idx) => (
          <div key={ing.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 16, textAlign: 'right' }}>{idx + 1}</span>
            <input style={{ ...inp, width: 70 }} value={ing.amount} onChange={e => updateIng(ing.id, 'amount', e.target.value)} placeholder="1 1/2" />
            <input style={{ ...inp, width: 60 }} value={ing.unit} onChange={e => updateIng(ing.id, 'unit', e.target.value)} placeholder="cups" />
            <input style={{ ...inp, flex: 2 }} value={ing.item} onChange={e => updateIng(ing.id, 'item', e.target.value)} placeholder="all-purpose flour" />
            <input style={{ ...inp, flex: 1 }} value={ing.note} onChange={e => updateIng(ing.id, 'note', e.target.value)} placeholder="sifted (optional)" />
            {ingredients.length > 1 && xBtn(() => removeIng(ing.id))}
          </div>
        ))}
        {addBtn(addIng, '+ Add Ingredient')}
      </div>

      <div>
        {lbl('Instructions')}
        {steps.map((step, idx) => (
          <div key={step.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: 'white', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 6 }}>{idx + 1}</span>
            <textarea style={{ ...inp, flex: 1, resize: 'vertical', minHeight: 56, lineHeight: 1.5 }} value={step.instruction} onChange={e => updateStep(step.id, e.target.value)} placeholder={`Step ${idx + 1}…`} />
            {steps.length > 1 && xBtn(() => removeStep(step.id))}
          </div>
        ))}
        {addBtn(addStep, '+ Add Step')}
      </div>

      <div>
        {lbl('Tags')}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {form.tags.map(t => <span key={t} className="tag-pill">{t}<button onClick={() => removeTag(t)}>×</button></span>)}
          <input className="tag-add-input" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }} placeholder="+ add tag" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>{lbl('Collection')}<select className="form-select" value={selectedCollection} onChange={e => setSelectedCollection(e.target.value)}>{collections.filter(c => c !== 'Favorites').map(c => <option key={c}>{c}</option>)}</select></div>
        <div>{lbl('Source URL')}<input style={inp} value={form.source_url} onChange={e => setField('source_url', e.target.value)} placeholder="https://… (optional)" /></div>
      </div>

      {error && <div className="error-msg">{error}</div>}
      <div className="btn-row">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Recipe'}</button>
      </div>
    </div>
  );
}

// ── Preview + edit after import ───────────────────────────────────
function RecipePreview({ recipe, collections, onBack, onSave, onClose }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editTags, setEditTags] = useState(recipe.tags || []);
  const [newTag, setNewTag] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('All Recipes');
  const [imageUrl, setImageUrl] = useState(recipe.image_url || '');
  const [imgError, setImgError] = useState(false);
  const unsplashUrl = `https://unsplash.com/s/photos/${encodeURIComponent(recipe.title)}`;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ ...recipe, tags: editTags, collection: selectedCollection, image_url: imageUrl || null });
      onClose();
    } catch (e) { setError(e.message); setSaving(false); }
  };

  const addTag = () => { const t = newTag.trim().toLowerCase(); if (t && !editTags.includes(t)) setEditTags(p => [...p, t]); setNewTag(''); };

  return (
    <>
      <div className="form-group">
        <label className="form-label">Photo</label>
        {imageUrl && !imgError ? (
          <div style={{ position: 'relative', marginBottom: 4 }}>
            <img src={imageUrl} alt={recipe.title} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, display: 'block' }} onError={() => setImgError(true)} />
            <button onClick={() => { setImageUrl(''); setImgError(false); }} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 26, height: 26, color: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
        ) : (
          <div style={{ background: 'var(--tag-bg)', borderRadius: 8, border: '1px dashed var(--border)', padding: '14px 16px', marginBottom: 4 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.6 }}>
              Search <a href={unsplashUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>Unsplash for "{recipe.title}" ↗</a> → right-click a photo → <strong>Copy image address</strong> → paste below.
            </div>
            <input className="form-input" style={{ marginBottom: 0 }} type="url" value={imageUrl} onChange={e => { setImageUrl(e.target.value); setImgError(false); }} placeholder="https://images.unsplash.com/..." />
          </div>
        )}
      </div>

      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, marginBottom: 4 }}>{recipe.title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
        {recipe.total_time && <span>⏱ {recipe.total_time}</span>}
        {recipe.servings && <span>🍽 {recipe.servings}</span>}
        <span>📋 {(recipe.ingredients || []).length} ingredients · {(recipe.steps || []).length} steps</span>
      </div>
      {recipe.description && <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 10, lineHeight: 1.5 }}>{recipe.description}</p>}

      <div className="form-group">
        <label className="form-label">Tags</label>
        <div className="tag-input-row">
          {editTags.map(tag => <span key={tag} className="tag-pill">{tag}<button onClick={() => setEditTags(p => p.filter(t => t !== tag))}>×</button></span>)}
          <input className="tag-add-input" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }} placeholder="+ add tag" />
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
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save to Vault'}</button>
      </div>
    </>
  );
}

// ── Main modal ────────────────────────────────────────────────────
export default function AddRecipeModal({ collections, onClose, onSave }) {
  const [tab, setTab] = useState('url');
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [scraped, setScraped] = useState(null);

  const [json, setJson] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [jsonRecipe, setJsonRecipe] = useState(null);

  const handleFetch = async () => {
    if (!url.trim()) return;
    setFetching(true); setFetchError(''); setScraped(null);
    try {
      const recipe = await scrapeRecipeFromUrl(url.trim());
      setScraped(recipe);
    } catch (e) {
      setFetchError(e.message);
    } finally {
      setFetching(false);
    }
  };

  const handlePasteJson = () => {
    setJsonError('');
    try {
      const m = json.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('No JSON object found.');
      const rec = JSON.parse(m[0]);
      if (!rec.title && !rec.ingredients) throw new Error("Doesn't look like a recipe JSON.");
      setJsonRecipe(rec);
    } catch (e) { setJsonError('Could not parse: ' + e.message); }
  };

  const TABS = [
    ['url', 'From URL'],
    ['create', 'Create Recipe'],
    ['json', 'Paste JSON'],
  ];

  const showPreview = (tab === 'url' && scraped) || (tab === 'json' && jsonRecipe);
  const previewRecipe = tab === 'url' ? scraped : jsonRecipe;
  const handleBack = () => { if (tab === 'url') setScraped(null); else setJsonRecipe(null); };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: tab === 'create' ? 680 : 480, maxHeight: '92vh' }}>
        <div className="modal-header">
          <h2>Add Recipe</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          {/* Tabs */}
          {!showPreview && (
            <div style={{ display: 'flex', gap: 2, background: 'var(--tag-bg)', borderRadius: 8, padding: 3, marginBottom: 18 }}>
              {TABS.map(([t, label]) => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ flex: 1, padding: '6px', border: 'none', borderRadius: 6, fontSize: 12, fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all .15s', background: tab === t ? 'white' : 'transparent', color: tab === t ? 'var(--text)' : 'var(--text-muted)', fontWeight: tab === t ? 500 : 400 }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* From URL */}
          {tab === 'url' && !scraped && (
            <>
              <div style={{ background: 'var(--tag-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
                Works on most recipe sites — AllRecipes, Taste of Home, Budget Bytes, Serious Eats, and many more. No API key needed.
              </div>
              {fetchError && <div className="error-msg">{fetchError}</div>}
              <div className="form-group">
                <label className="form-label">Recipe URL</label>
                <input className="form-input" type="url" value={url} onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleFetch()}
                  placeholder="https://www.allrecipes.com/recipe/..." autoFocus />
                <div className="form-hint">Paste any recipe URL and hit Fetch — structured data is extracted automatically.</div>
              </div>
              <div className="btn-row">
                <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" onClick={handleFetch} disabled={fetching || !url.trim()}>
                  {fetching ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
                      Fetching…
                    </span>
                  ) : 'Fetch Recipe →'}
                </button>
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </>
          )}

          {/* Create */}
          {tab === 'create' && !showPreview && (
            <CreateForm collections={collections} onClose={onClose} onSave={onSave} />
          )}

          {/* Paste JSON */}
          {tab === 'json' && !jsonRecipe && (
            <>
              <div style={{ background: 'var(--accent-light)', border: '1px solid #E8C4A8', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#7A3A18', lineHeight: 1.7, marginBottom: 14 }}>
                <strong>Via Claude chat (free):</strong> paste a URL here in chat, say <em>"Extract this recipe for my vault"</em>, then copy the JSON block Claude returns and paste it below.
              </div>
              {jsonError && <div className="error-msg">{jsonError}</div>}
              <div className="form-group">
                <label className="form-label">JSON from Claude</label>
                <textarea className="form-textarea" style={{ fontFamily: 'monospace', fontSize: 11, minHeight: 140, lineHeight: 1.5 }} value={json} onChange={e => setJson(e.target.value)} placeholder={'{"title":"...","ingredients":[...],"steps":[...],...}'} autoFocus />
              </div>
              <div className="btn-row">
                <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" onClick={handlePasteJson} disabled={!json.trim()}>Import →</button>
              </div>
            </>
          )}

          {/* Preview */}
          {showPreview && (
            <RecipePreview
              recipe={previewRecipe}
              collections={collections}
              onBack={handleBack}
              onSave={onSave}
              onClose={onClose}
            />
          )}

        </div>
      </div>
    </div>
  );
}
