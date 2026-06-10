import { useState } from 'react';
import CookingMode from './CookingMode';

const UNICODE_FRACS = { '\u00bd':'1/2','\u00bc':'1/4','\u00be':'3/4','\u2153':'1/3','\u2154':'2/3','\u215b':'1/8','\u215c':'3/8','\u215d':'5/8','\u215e':'7/8' };
function normalizeFracs(s) { return s.replace(/[\u00bd\u00bc\u00be\u2153\u2154\u215b\u215c\u215d\u215e]/g, m => UNICODE_FRACS[m]); }

function parseAmount(str) {
  if (!str && str !== 0) return null;
  const s = normalizeFracs(str.toString().trim());
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[1]) / parseInt(frac[2]);
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function formatAmount(n) {
  if (n === null) return '';
  const FRACS = [[1/8,'1/8'],[1/4,'1/4'],[1/3,'1/3'],[3/8,'3/8'],[1/2,'1/2'],[5/8,'5/8'],[2/3,'2/3'],[3/4,'3/4'],[7/8,'7/8']];
  const whole = Math.floor(n);
  const frac = n - whole;
  if (frac < 0.01) return whole === 0 ? '' : whole.toString();
  let best = null, bestDiff = Infinity;
  for (const [v, sym] of FRACS) { const d = Math.abs(frac - v); if (d < bestDiff) { bestDiff = d; best = sym; } }
  if (bestDiff < 0.06) return whole > 0 ? `${whole} ${best}` : best;
  return n % 1 === 0 ? n.toString() : n.toFixed(1);
}

function scaleAmt(amount, scale) {
  if (scale === 1) return amount;
  if (!amount) return amount;
  const rangeMatch = amount.toString().match(/^(.+?)\s*(-|to)\s*(.+)$/i);
  if (rangeMatch) {
    const n1 = parseAmount(rangeMatch[1]);
    const n2 = parseAmount(rangeMatch[3]);
    const sep = /to/i.test(rangeMatch[2]) ? ' to ' : '-';
    if (n1 !== null && n2 !== null) return `${formatAmount(n1 * scale)}${sep}${formatAmount(n2 * scale)}`;
  }
  const n = parseAmount(amount);
  if (n === null) return amount;
  return formatAmount(n * scale);
}

export default function RecipeView({ recipe, collections, onClose, onUpdate, onDelete }) {
  const [imgError, setImgError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [scale, setScale] = useState(1);
  const [cookMode, setCookMode] = useState(false);
  const [editingImage, setEditingImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');

  // Full edit mode
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  const {
    id, title, description, image_url, prep_time, cook_time, total_time,
    servings, ingredients = [], steps = [], tags = [], source_url, favorited,
    collection: col
  } = recipe;

  const handleDelete = () => {
    if (confirmDelete) onDelete(id);
    else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); }
  };

  const scaledServings = () => {
    if (scale === 1 || !servings) return servings;
    const n = parseFloat(servings);
    if (!isNaN(n)) return `${n * scale} (${scale}x)`;
    return `${servings} x${scale}`;
  };

  // ── Edit mode ──────────────────────────────────────────────────
  const enterEditMode = () => {
    setDraft({
      title: title || '',
      description: description || '',
      prep_time: prep_time || '',
      cook_time: cook_time || '',
      total_time: total_time || '',
      servings: servings || '',
      ingredients: ingredients.map(i => ({ amount: i.amount||'', unit: i.unit||'', item: i.item||'', note: i.note||'' })),
      steps: steps.map(s => ({ instruction: s.instruction||'' })),
      tags: [...(tags||[])],
      source_url: source_url || '',
    });
    setEditMode(true);
    setScale(1);
  };

  const saveEdits = async () => {
    setSaving(true);
    const cleaned = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      prep_time: draft.prep_time.trim() || null,
      cook_time: draft.cook_time.trim() || null,
      total_time: draft.total_time.trim() || null,
      servings: draft.servings.trim() || null,
      ingredients: draft.ingredients.filter(i => i.item.trim()).map((i, idx) => ({
        amount: i.amount.trim(), unit: i.unit.trim() || null, item: i.item.trim(), note: i.note.trim() || null, number: idx + 1
      })),
      steps: draft.steps.filter(s => s.instruction.trim()).map((s, idx) => ({ number: idx + 1, instruction: s.instruction.trim() })),
      tags: draft.tags,
      source_url: draft.source_url.trim() || '',
    };
    await onUpdate(id, cleaned);
    setSaving(false);
    setEditMode(false);
    setDraft(null);
  };

  const cancelEdits = () => { setEditMode(false); setDraft(null); };

  // Draft mutators
  const setField = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const setIng = (i, k, v) => setDraft(d => ({ ...d, ingredients: d.ingredients.map((ing, idx) => idx === i ? { ...ing, [k]: v } : ing) }));
  const addIng = () => setDraft(d => ({ ...d, ingredients: [...d.ingredients, { amount:'', unit:'', item:'', note:'' }] }));
  const removeIng = (i) => setDraft(d => ({ ...d, ingredients: d.ingredients.filter((_, idx) => idx !== i) }));
  const setStep = (i, v) => setDraft(d => ({ ...d, steps: d.steps.map((s, idx) => idx === i ? { instruction: v } : s) }));
  const addStep = () => setDraft(d => ({ ...d, steps: [...d.steps, { instruction:'' }] }));
  const removeStep = (i) => setDraft(d => ({ ...d, steps: d.steps.filter((_, idx) => idx !== i) }));
  const [newTag, setNewTag] = useState('');
  const addTag = () => { const t = newTag.trim().toLowerCase(); if (t && !draft.tags.includes(t)) setField('tags', [...draft.tags, t]); setNewTag(''); };

  const handleImageSave = () => {
    const url = newImageUrl.trim();
    onUpdate(id, { image_url: url || null });
    setImgError(false);
    setEditingImage(false);
    setNewImageUrl('');
  };

  const handleEditImage = () => {
    setNewImageUrl(image_url || '');
    setEditingImage(true);
    setImgError(false);
  };

  const unsplashUrl = `https://unsplash.com/s/photos/${encodeURIComponent(title)}`;

  const inp = { padding: '8px 11px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 14, fontFamily: 'var(--font-body)', color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' };

  return (
    <>
      {cookMode && <CookingMode recipe={recipe} scale={scale} onClose={() => setCookMode(false)} />}

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 28px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
          {editMode ? (
            <>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500 }}>Editing Recipe</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button onClick={cancelEdits} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-body)', cursor: 'pointer' }}>Cancel</button>
                <button onClick={saveEdits} disabled={saving} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </>
          ) : (
            <>
              <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', padding: '6px 10px', borderRadius: 7, border: 'none', background: 'transparent', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--tag-bg)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                Back
              </button>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 2, background: 'var(--tag-bg)', borderRadius: 8, padding: 3 }}>
                  {[1, 2, 3].map(s => (
                    <button key={s} onClick={() => setScale(s)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: scale === s ? 600 : 400, fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all 0.15s', background: scale === s ? 'var(--accent)' : 'transparent', color: scale === s ? 'white' : 'var(--text-muted)' }}>
                      {s}x
                    </button>
                  ))}
                </div>
                <button onClick={() => setCookMode(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid #E8C4A8', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer' }}>Cook Mode</button>
                <button onClick={enterEditMode} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-body)', cursor: 'pointer' }}>✎ Edit</button>
                <select style={{ fontSize: 12, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface)', fontFamily: 'var(--font-body)', cursor: 'pointer', outline: 'none', color: 'var(--text-muted)' }} value={col || 'All Recipes'} onChange={e => onUpdate(id, { collection: e.target.value })}>
                  {collections.filter(c => c !== 'Favorites').map(c => <option key={c}>{c}</option>)}
                </select>
                <button onClick={() => onUpdate(id, { favorited: !favorited })} style={{ width: 34, height: 34, borderRadius: 7, border: '1px solid var(--border)', background: favorited ? 'var(--accent-light)' : 'var(--surface)', cursor: 'pointer', fontSize: 16, color: favorited ? 'var(--accent)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{favorited ? '♥' : '♡'}</button>
                <button onClick={handleDelete} style={{ width: 34, height: 34, borderRadius: 7, border: `1px solid ${confirmDelete ? '#FADBD8' : 'var(--border)'}`, background: confirmDelete ? '#FDEDEC' : 'var(--surface)', cursor: 'pointer', fontSize: 15, color: confirmDelete ? '#C0392B' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{confirmDelete ? '?' : '🗑'}</button>
              </div>
            </>
          )}
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Hero image */}
          {!editingImage && image_url && !imgError ? (
            <div style={{ position: 'relative' }}>
              <img src={image_url} alt={title} onError={() => setImgError(true)} style={{ width: '100%', height: 300, objectFit: 'cover', display: 'block' }} />
              <button onClick={handleEditImage} style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 7, color: 'white', fontSize: 11, fontFamily: 'var(--font-body)', fontWeight: 500, padding: '6px 12px', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>Change Photo</button>
            </div>
          ) : !editingImage ? (
            <div style={{ background: 'var(--tag-bg)', borderBottom: '1px solid var(--border)', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No photo.</span>
              <button onClick={handleEditImage} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500, padding: 0 }}>+ Add photo</button>
            </div>
          ) : null}

          {editingImage && (
            <div style={{ background: 'var(--tag-bg)', borderBottom: '1px solid var(--border)', padding: '16px 28px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                Search <a href={unsplashUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>Unsplash for "{title}" ↗</a> then right-click a photo and select Copy image address.
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input autoFocus type="url" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleImageSave(); if (e.key === 'Escape') setEditingImage(false); }} placeholder="https://images.unsplash.com/..." style={{ flex: 1, padding: '8px 11px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none', background: 'white' }} />
                <button onClick={handleImageSave} style={{ padding: '8px 16px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-body)', cursor: 'pointer' }}>Save</button>
                <button onClick={() => setEditingImage(false)} style={{ padding: '8px 12px', background: 'var(--tag-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, fontFamily: 'var(--font-body)', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ padding: '32px 48px 60px', maxWidth: 1100, margin: '0 auto' }}>

            {editMode ? (
              /* ═══ EDIT MODE ═══ */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Title</label>
                  <input style={{ ...inp, width: '100%', fontSize: 22, fontFamily: 'var(--font-display)' }} value={draft.title} onChange={e => setField('title', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Description</label>
                  <textarea style={{ ...inp, width: '100%', resize: 'vertical', minHeight: 60, lineHeight: 1.5 }} value={draft.description} onChange={e => setField('description', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                  {[['Prep','prep_time'],['Cook','cook_time'],['Total','total_time'],['Serves','servings']].map(([label, key]) => (
                    <div key={key}>
                      <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>{label}</label>
                      <input style={{ ...inp, width: '100%' }} value={draft[key]} onChange={e => setField(key, e.target.value)} />
                    </div>
                  ))}
                </div>

                {/* Ingredients edit */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Ingredients</label>
                  {draft.ingredients.map((ing, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 16, textAlign: 'right' }}>{i+1}</span>
                      <input style={{ ...inp, width: 80, fontSize: 13 }} placeholder="1 1/2" value={ing.amount} onChange={e => setIng(i, 'amount', e.target.value)} />
                      <input style={{ ...inp, width: 70, fontSize: 13 }} placeholder="cups" value={ing.unit} onChange={e => setIng(i, 'unit', e.target.value)} />
                      <input style={{ ...inp, flex: 2, fontSize: 13 }} placeholder="ingredient" value={ing.item} onChange={e => setIng(i, 'item', e.target.value)} />
                      <input style={{ ...inp, flex: 1, fontSize: 13 }} placeholder="note" value={ing.note} onChange={e => setIng(i, 'note', e.target.value)} />
                      <button onClick={() => removeIng(i)} style={{ background: 'none', border: 'none', color: '#C0392B', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}>×</button>
                    </div>
                  ))}
                  <button onClick={addIng} style={{ marginTop: 4, fontSize: 12, color: 'var(--accent)', background: 'var(--accent-light)', border: '1px solid #E8C4A8', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500 }}>+ Add Ingredient</button>
                </div>

                {/* Steps edit */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Instructions</label>
                  {draft.steps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: 'white', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 6 }}>{i+1}</span>
                      <textarea style={{ ...inp, flex: 1, resize: 'vertical', minHeight: 56, lineHeight: 1.5, fontSize: 14 }} value={step.instruction} onChange={e => setStep(i, e.target.value)} />
                      <button onClick={() => removeStep(i)} style={{ background: 'none', border: 'none', color: '#C0392B', fontSize: 16, cursor: 'pointer', padding: '6px 4px' }}>×</button>
                    </div>
                  ))}
                  <button onClick={addStep} style={{ marginTop: 4, fontSize: 12, color: 'var(--accent)', background: 'var(--accent-light)', border: '1px solid #E8C4A8', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500 }}>+ Add Step</button>
                </div>

                {/* Tags edit */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Tags</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {draft.tags.map(t => <span key={t} className="tag-pill">{t}<button onClick={() => setField('tags', draft.tags.filter(x => x !== t))}>×</button></span>)}
                    <input className="tag-add-input" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }} placeholder="+ add tag" />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Source URL</label>
                  <input style={{ ...inp, width: '100%', fontSize: 12 }} value={draft.source_url} onChange={e => setField('source_url', e.target.value)} />
                </div>
              </div>
            ) : (
              /* ═══ DISPLAY MODE ═══ */
              <>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 46, fontWeight: 400, lineHeight: 1.1, marginBottom: 12, letterSpacing: '-0.01em' }}>{title}</h1>
                {description && <p style={{ fontSize: 16, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 22, fontStyle: 'italic' }}>{description}</p>}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, padding: '16px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
                  {[['Prep', prep_time], ['Cook', cook_time], ['Total', total_time], ['Serves', scaledServings()]].filter(x => x[1]).map(([l, v]) => (
                    <div key={l}>
                      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>{l}</div>
                      <div style={{ fontSize: 15, fontWeight: 500, marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                  {scale > 1 && <div style={{ marginLeft: 'auto', background: 'var(--accent-light)', border: '1px solid #E8C4A8', borderRadius: 8, padding: '4px 12px', fontSize: 12, color: '#7A3A18', fontWeight: 600, display: 'flex', alignItems: 'center' }}>{scale}x Recipe</div>}
                </div>

                {tags.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 36 }}>{tags.map(t => <span key={t} className="tag">{t}</span>)}</div>}

                <div className="rv-columns-live" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 56, alignItems: 'start' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, marginBottom: 16 }}>Ingredients</div>
                    <ul style={{ listStyle: 'none' }}>
                      {ingredients.map((ing, i) => (
                        <li key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 14, lineHeight: 1.4, ...(i === 0 ? { borderTop: '1px solid var(--border)' } : {}) }}>
                          <span style={{ fontWeight: 600, minWidth: 72, color: 'var(--accent)', fontSize: 13, flexShrink: 0 }}>{scaleAmt(ing.amount, scale)}{ing.unit ? ` ${ing.unit}` : ''}</span>
                          <span>{ing.item}{ing.note && <span style={{ color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic', display: 'block', marginTop: 2 }}>{ing.note}</span>}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, marginBottom: 16 }}>Instructions</div>
                    <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 24 }}>
                      {steps.map((step, i) => (
                        <li key={i} style={{ display: 'flex', gap: 16 }}>
                          <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>{step.number || i + 1}</span>
                          <p style={{ fontSize: 15, lineHeight: 1.7, paddingTop: 4 }}>{step.instruction}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                {source_url && <div style={{ marginTop: 48, paddingTop: 20, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>Source: <a href={source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{source_url}</a></div>}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
