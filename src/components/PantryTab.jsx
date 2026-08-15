import { useState } from 'react';
import { PRESET_STAPLES } from '../lib/grocery';

export default function PantryTab({ staples, onUpdate }) {
  const [customInput, setCustomInput] = useState('');
  const active = new Set(staples || []);

  // Custom staples = active ones not in any preset group
  const presetAll = new Set(Object.values(PRESET_STAPLES).flat());
  const customStaples = (staples || []).filter(s => !presetAll.has(s));

  const toggle = (item) => {
    const next = new Set(active);
    next.has(item) ? next.delete(item) : next.add(item);
    onUpdate([...next]);
  };

  const addCustom = () => {
    const t = customInput.trim().toLowerCase();
    if (t && !active.has(t)) onUpdate([...active, t]);
    setCustomInput('');
  };

  const chip = (item, isActive) => (
    <button key={item} onClick={() => toggle(item)}
      style={{
        padding: '6px 13px', borderRadius: 20, fontSize: 12, fontFamily: 'var(--font-body)',
        cursor: 'pointer', transition: 'all 0.15s', fontWeight: isActive ? 600 : 400,
        border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
        background: isActive ? 'var(--accent-light)' : 'var(--surface)',
        color: isActive ? '#7A3A18' : 'var(--text-muted)',
      }}>
      {isActive ? '✓ ' : ''}{item}
    </button>
  );

  return (
    <div className="pt-view" style={{ maxWidth: 720, margin: '0 auto', padding: '24px 24px 60px' }}>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500 }}>Pantry Staples</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 4, maxWidth: 560 }}>
          Mark the things you always keep stocked. When a grocery list is generated, staples come pre-checked with a label — so you see them but don't shop for them. Tap any item on a list to uncheck it if you've run out.
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginBottom: 20 }}>
        {active.size} staple{active.size !== 1 ? 's' : ''} marked
      </div>

      {Object.entries(PRESET_STAPLES).map(([group, items]) => (
        <div key={group} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)', marginBottom: 8, paddingBottom: 5, borderBottom: '2px solid var(--border)' }}>{group}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {items.map(item => chip(item, active.has(item)))}
          </div>
        </div>
      ))}

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)', marginBottom: 8, paddingBottom: 5, borderBottom: '2px solid var(--border)' }}>Custom</div>
        {customStaples.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {customStaples.map(item => chip(item, true))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={customInput} onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addCustom(); }}
            placeholder="Add your own staple…"
            style={{ flex: 1, maxWidth: 280, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', background: 'var(--surface)' }} />
          <button onClick={addCustom} disabled={!customInput.trim()}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: customInput.trim() ? 'var(--accent)' : 'var(--tag-bg)', color: customInput.trim() ? 'white' : 'var(--text-muted)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)', cursor: customInput.trim() ? 'pointer' : 'default' }}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
