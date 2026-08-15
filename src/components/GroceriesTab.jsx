import { useState, useEffect } from 'react';
import { CAT_ICON, CAT_ORDER, matchesStaple, shoppingAmountText, coreItem, mergeIngredientsIntoList } from '../lib/grocery';

const inp = { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text)', background: 'var(--surface)', outline: 'none', boxSizing: 'border-box' };

// Defined OUTSIDE the parent component so its identity is stable across
// re-renders — an inline component defined inside render() gets a new
// reference every render, which makes React remount the DOM (and drop
// input focus) on every keystroke. This fixes that.
function QuickAddRow({ newAmount, setNewAmount, newUnit, setNewUnit, newItem, setNewItem, addItem }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input value={newAmount} onChange={e => setNewAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} placeholder="amt" style={{ ...inp, width: 56 }} />
      <input value={newUnit} onChange={e => setNewUnit(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} placeholder="unit" style={{ ...inp, width: 64 }} />
      <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} placeholder="Add an item…" style={{ ...inp, flex: 1 }} />
      <button onClick={addItem} disabled={!newItem.trim()} style={{ padding: '8px 16px', borderRadius: 7, border: 'none', background: newItem.trim() ? 'var(--accent)' : 'var(--tag-bg)', color: newItem.trim() ? 'white' : 'var(--text-muted)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)', cursor: newItem.trim() ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
        + Add
      </button>
    </div>
  );
}

export default function GroceriesTab({ savedList, onUpdate, staples }) {
  const [copied, setCopied] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newItem, setNewItem] = useState('');

  // savedList = { items: [{amount, unit, item, category, recipes}], checked: [keys], savedAt }
  const items = savedList?.items || [];
  const checked = new Set(savedList?.checked || []);

  const itemKey = (it) => coreItem(it.item);

  // Auto-cross-out staples whenever the list or staples change — covers items
  // added individually, whole-recipe adds, and lists saved before this rule.
  // We track which staple keys we've already auto-applied (autoStaples) so a
  // manual uncheck ("actually I need this") isn't immediately re-checked again.
  useEffect(() => {
    if (!items.length || !staples?.length) return;
    const autoApplied = new Set(savedList?.autoStaples || []);
    const stapleKeys = items.filter(it => matchesStaple(it.item, staples)).map(it => coreItem(it.item));
    const newOnes = stapleKeys.filter(k => !autoApplied.has(k) && !checked.has(k));
    if (!newOnes.length) return;
    onUpdate({
      ...savedList,
      checked: [...checked, ...newOnes],
      autoStaples: [...autoApplied, ...stapleKeys],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, staples]);

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
    const lines = items.filter(it => !checked.has(itemKey(it))).map(it => [shoppingAmountText(it), it.item].filter(Boolean).join(' '));
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Quick-add a one-off item directly to the list (e.g. "paper towels", or
  // anything not tied to a recipe). Merges with the same core-item logic
  // everything else uses, so it combines correctly with recipe-sourced items.
  const addItem = () => {
    const name = newItem.trim();
    if (!name) return;
    const ing = { amount: newAmount.trim(), unit: newUnit.trim() || null, item: name };
    const merged = mergeIngredientsIntoList(items, { title: 'Added manually', ingredients: [ing] });
    onUpdate({
      ...savedList,
      items: merged,
      checked: savedList?.checked || [],
      autoStaples: savedList?.autoStaples || [],
      savedAt: savedList?.savedAt || new Date().toISOString(),
    });
    setNewAmount(''); setNewUnit(''); setNewItem('');
  };

  if (!items.length) {
    return (
      <div className="gt-view" style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px 60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{ fontSize: 40, opacity: 0.25 }}>🛒</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-muted)', fontWeight: 500 }}>No saved grocery list</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 380, lineHeight: 1.5 }}>
            Generate a list from selected recipes or your weekly plan, add ingredients from a recipe page, or add your own item below.
          </p>
        </div>
        <QuickAddRow newAmount={newAmount} setNewAmount={setNewAmount} newUnit={newUnit} setNewUnit={setNewUnit} newItem={newItem} setNewItem={setNewItem} addItem={addItem} />
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
    <div className="gt-view" style={{ maxWidth: 640, margin: '0 auto', padding: '24px 24px 60px' }}>
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

      {/* Quick add */}
      <div style={{ marginBottom: 22, paddingBottom: 18, borderBottom: '1px solid var(--border)' }}>
        <QuickAddRow newAmount={newAmount} setNewAmount={setNewAmount} newUnit={newUnit} setNewUnit={setNewUnit} newItem={newItem} setNewItem={setNewItem} addItem={addItem} />
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
                  <strong style={{ color: 'var(--accent)' }}>{shoppingAmountText(it)}</strong> {it.item}
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
