import { useState } from 'react';
import { CAT_ICON, CAT_ORDER, matchesStaple, amountText, coreItem } from '../lib/grocery';

export default function GroceriesTab({ savedList, onUpdate, staples }) {
  const [copied, setCopied] = useState(false);

  // savedList = { items: [{amount, unit, item, category, recipes}], checked: [keys], savedAt }
  const items = savedList?.items || [];
  const checked = new Set(savedList?.checked || []);

  const itemKey = (it) => coreItem(it.item);

  const toggle = (it) => {
    const k = itemKey(it);
    const next = new Set(checked);
    next.has(k) ? next.delete(k) : next.add(k);
    onUpdate({ ...savedList, checked: [...next] });
  };

  const clearList = () => {
    if (confirm('Clear your saved grocery list?')) onUpdate(null);
  };

  const exportList = () => {
    const lines = items.filter(it => !checked.has(itemKey(it))).map(it => [amountText(it), it.item].filter(Boolean).join(' '));
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!items.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center', gap: 10, height: '100%' }}>
        <div style={{ fontSize: 40, opacity: 0.25 }}>🛒</div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-muted)', fontWeight: 500 }}>No saved grocery list</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360, lineHeight: 1.5 }}>
          Generate a shopping list from selected recipes or your weekly plan, then tap <strong>Save to Groceries</strong> to keep it here.
        </p>
      </div>
    );
  }

  // Group items by category
  const grouped = {};
  items.forEach((it, i) => { const c = it.category || 'Other'; (grouped[c] = grouped[c] || []).push({ ...it, _idx: i }); });
  const orderedCats = CAT_ORDER.filter(c => grouped[c]);

  const remaining = items.filter(it => !checked.has(itemKey(it))).length;
  const savedDate = savedList.savedAt ? new Date(savedList.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 24px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500 }}>Grocery List</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{remaining} of {items.length} remaining{savedDate ? ` · saved ${savedDate}` : ''}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={clearList} style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-body)', cursor: 'pointer' }}>Clear</button>
          <button onClick={exportList} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer' }}>{copied ? '✓ Copied!' : 'Export'}</button>
        </div>
      </div>

      {orderedCats.map(cat => (
        <div key={cat} style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, paddingBottom: 5, borderBottom: '2px solid var(--border)' }}>
            <span style={{ fontSize: 14 }}>{CAT_ICON[cat]}</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)' }}>{cat}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({grouped[cat].length})</span>
          </div>
          {grouped[cat].map(it => {
            const isChecked = checked.has(itemKey(it));
            return (
              <label key={it._idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 4px', cursor: 'pointer', opacity: isChecked ? 0.4 : 1, transition: 'opacity 0.15s' }}>
                <input type="checkbox" checked={isChecked} onChange={() => toggle(it)} style={{ marginTop: 2, accentColor: 'var(--accent)', width: 15, height: 15, flexShrink: 0 }} />
                <span style={{ fontSize: 13, lineHeight: 1.45, textDecoration: isChecked ? 'line-through' : 'none' }}>
                  <strong style={{ color: 'var(--accent)' }}>{amountText(it)}</strong> {it.item}
                  {matchesStaple(it.item, staples) && <span style={{ fontSize: 9, fontWeight: 600, color: '#7A3A18', background: 'var(--accent-light)', borderRadius: 20, padding: '1px 7px', marginLeft: 6, verticalAlign: 'middle' }}>staple</span>}
                </span>
              </label>
            );
          })}
        </div>
      ))}
    </div>
  );
}
