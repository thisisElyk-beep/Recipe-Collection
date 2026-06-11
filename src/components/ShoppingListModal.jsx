import { useState, useMemo, useEffect } from 'react';
import { parseAmount, formatAmount, normUnit, normItem, normKey, categorize, CAT_ORDER, CAT_ICON, matchesStaple } from '../lib/grocery';

// ── Merge ingredients across recipes ──────────────────────────────
function buildShoppingList(recipes) {
  const map = new Map();
  for (const recipe of recipes) {
    for (const ing of (recipe.ingredients || [])) {
      if (!ing.item) continue;
      const key = normKey(ing.item, ing.unit);
      if (map.has(key)) {
        const existing = map.get(key);
        const a = parseAmount(existing.amount);
        const b = parseAmount(ing.amount);
        if (a !== null && b !== null) existing.amount = formatAmount(a + b);
        else if (ing.amount && !existing.amount) existing.amount = ing.amount;
        existing.recipes.add(recipe.title);
      } else {
        map.set(key, { amount: ing.amount || '', unit: ing.unit || null, item: ing.item, recipes: new Set([recipe.title]), category: categorize(ing.item) });
      }
    }
  }
  return [...map.values()];
}

export default function ShoppingListModal({ recipes, onClose, onSaveToGroceries, staples }) {
  const items = useMemo(() => buildShoppingList(recipes), [recipes]);
  // Persist checked state across reopens, keyed by item identity
  const storageKey = 'shoppingChecked';
  const [checked, setChecked] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(storageKey) || '[]')); } catch { return new Set(); }
  });

  // Auto-check staples — runs whenever items or staples change (staples load async from Firebase)
  useEffect(() => {
    if (!staples?.length) return;
    const stapleKeys = items.filter(it => matchesStaple(it.item, staples)).map(it => `${it.item}|${it.unit||''}`);
    if (!stapleKeys.length) return;
    setChecked(prev => {
      const next = new Set(prev);
      stapleKeys.forEach(k => next.add(k));
      return next;
    });
  }, [items, staples]);
  const [copied, setCopied] = useState(false);
  const [copiedPlain, setCopiedPlain] = useState(false);
  const [savedToGroceries, setSavedToGroceries] = useState(false);

  const persistChecked = (next) => {
    try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch {}
  };

  // Group by category
  const grouped = useMemo(() => {
    const g = {};
    items.forEach((it, i) => {
      (g[it.category] = g[it.category] || []).push({ ...it, _idx: i });
    });
    Object.values(g).forEach(list => list.sort((a, b) => a.item.localeCompare(b.item)));
    return CAT_ORDER.filter(c => g[c]).map(c => [c, g[c]]);
  }, [items]);

  // Key by item name so check state is stable across reopens
  const itemKey = (it) => `${it.item}|${it.unit||''}`;
  const toggle = (it) => setChecked(prev => {
    const k = itemKey(it);
    const n = new Set(prev);
    n.has(k) ? n.delete(k) : n.add(k);
    persistChecked(n);
    return n;
  });
  const clearChecked = () => { const n = new Set(); setChecked(n); persistChecked(n); };

  const copyList = () => {
    const lines = [];
    for (const [cat, list] of grouped) {
      const unchecked = list.filter(it => !checked.has(itemKey(it)));
      if (!unchecked.length) continue;
      lines.push(`${cat.toUpperCase()}`);
      unchecked.forEach(it => lines.push(`- ${[it.amount, it.unit, it.item].filter(Boolean).join(' ')}`));
      lines.push('');
    }
    navigator.clipboard.writeText(lines.join('\n').trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Plain list, no category headers — one item per line, for TickTick etc.
  const copyPlain = () => {
    const lines = [];
    for (const [, list] of grouped) {
      list.filter(it => !checked.has(itemKey(it)))
        .forEach(it => lines.push([it.amount, it.unit, it.item].filter(Boolean).join(' ')));
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedPlain(true);
    setTimeout(() => setCopiedPlain(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 520, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <h2>Shopping List</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
            {items.length} items from {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}: <em>{recipes.map(r => r.title).join(', ')}</em>
          </div>

          {grouped.map(([cat, list]) => (
            <div key={cat} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, paddingBottom: 5, borderBottom: '2px solid var(--border)' }}>
                <span style={{ fontSize: 14 }}>{CAT_ICON[cat]}</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text)' }}>{cat}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({list.length})</span>
              </div>
              {list.map(it => { const k = itemKey(it); const isChecked = checked.has(k); return (
                <label key={it._idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 4px', cursor: 'pointer', opacity: isChecked ? 0.4 : 1, transition: 'opacity 0.15s' }}>
                  <input type="checkbox" checked={isChecked} onChange={() => toggle(it)}
                    style={{ marginTop: 2, accentColor: 'var(--accent)', width: 15, height: 15, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, lineHeight: 1.45, textDecoration: isChecked ? 'line-through' : 'none' }}>
                    <strong style={{ color: 'var(--accent)' }}>{[it.amount, it.unit].filter(Boolean).join(' ')}</strong>
                    {' '}{it.item}
                    {matchesStaple(it.item, staples) && <span style={{ fontSize: 9, fontWeight: 600, color: '#7A3A18', background: 'var(--accent-light)', borderRadius: 20, padding: '1px 7px', marginLeft: 6, verticalAlign: 'middle' }}>staple</span>}
                    {it.recipes.size > 1 && <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginTop: 1 }}>used in {it.recipes.size} recipes</span>}
                  </span>
                </label>
              ); })}
            </div>
          ))}

        </div>

        {/* Pinned footer — always visible while the list scrolls */}
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: '12px 20px 14px', background: 'var(--surface)' }}>
          <div className="btn-row" style={{ flexWrap: 'wrap', marginTop: 0 }}>
            <button className="btn btn-secondary" onClick={clearChecked}>Uncheck All</button>
            {onSaveToGroceries && (
              <button className="btn btn-secondary" onClick={() => { onSaveToGroceries(items.map(it => ({ ...it, recipes: [...it.recipes] })), [...checked]); setSavedToGroceries(true); setTimeout(() => setSavedToGroceries(false), 2000); }}>
                {savedToGroceries ? '✓ Saved!' : 'Save to Groceries'}
              </button>
            )}
            <button className="btn btn-primary" onClick={copyPlain} title="Plain list, no category headers — for pasting into TickTick or other apps">
              {copiedPlain ? '✓ Copied!' : 'Export'}
            </button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, textAlign: 'right' }}>
            Checked items are excluded from Export.
          </div>
        </div>
      </div>
    </div>
  );
}
