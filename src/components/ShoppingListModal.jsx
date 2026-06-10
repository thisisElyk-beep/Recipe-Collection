import { useState, useMemo } from 'react';

// ── Amount parsing for merging ────────────────────────────────────
function parseAmount(str) {
  if (!str && str !== 0) return null;
  const s = str.toString().trim();
  // Take upper bound of ranges
  const range = s.match(/^(.+?)\s*(?:-|to)\s*(.+)$/i);
  if (range) return parseAmount(range[2]);
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
  return n % 1 === 0 ? n.toString() : n.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
}

// Normalize units for matching (cup/cups/Cup → cup)
function normUnit(u) {
  if (!u) return '';
  const x = u.toLowerCase().replace(/\.$/,'').trim();
  const MAP = { cups:'cup', tablespoons:'tbsp', tablespoon:'tbsp', tbs:'tbsp', teaspoons:'tsp', teaspoon:'tsp', pounds:'lb', pound:'lb', lbs:'lb', ounces:'oz', ounce:'oz', grams:'g', gram:'g', cloves:'clove', cans:'can', packages:'pkg', pkgs:'pkg' };
  return MAP[x] || x;
}

function normItem(item) {
  return (item||'').toLowerCase().replace(/[^a-z\s]/g,'').replace(/\s+/g,' ').trim();
}

// ── Merge ingredients across recipes ──────────────────────────────
function buildShoppingList(recipes) {
  const map = new Map();
  for (const recipe of recipes) {
    for (const ing of (recipe.ingredients || [])) {
      if (!ing.item) continue;
      const key = `${normItem(ing.item)}|${normUnit(ing.unit)}`;
      if (map.has(key)) {
        const existing = map.get(key);
        const a = parseAmount(existing.amount);
        const b = parseAmount(ing.amount);
        if (a !== null && b !== null) {
          existing.amount = formatAmount(a + b);
        } else if (ing.amount && !existing.amount) {
          existing.amount = ing.amount;
        }
        existing.recipes.add(recipe.title);
      } else {
        map.set(key, {
          amount: ing.amount || '',
          unit: ing.unit || null,
          item: ing.item,
          recipes: new Set([recipe.title]),
        });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.item.localeCompare(b.item));
}

export default function ShoppingListModal({ recipes, onClose }) {
  const items = useMemo(() => buildShoppingList(recipes), [recipes]);
  const [checked, setChecked] = useState(new Set());
  const [copied, setCopied] = useState(false);

  const toggle = (i) => setChecked(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const copyList = () => {
    const lines = items
      .filter((_, i) => !checked.has(i))
      .map(it => `- ${[it.amount, it.unit, it.item].filter(Boolean).join(' ')}`);
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 520, maxHeight: '88vh' }}>
        <div className="modal-header">
          <h2>Shopping List</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
            {items.length} items from {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}: <em>{recipes.map(r => r.title).join(', ')}</em>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 16 }}>
            {items.map((it, i) => (
              <label key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 4px',
                borderBottom: '1px solid var(--border)', cursor: 'pointer',
                opacity: checked.has(i) ? 0.45 : 1, transition: 'opacity 0.15s',
              }}>
                <input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)}
                  style={{ marginTop: 3, accentColor: 'var(--accent)', width: 15, height: 15, flexShrink: 0 }} />
                <span style={{ fontSize: 13, lineHeight: 1.45, textDecoration: checked.has(i) ? 'line-through' : 'none' }}>
                  <strong style={{ color: 'var(--accent)' }}>{[it.amount, it.unit].filter(Boolean).join(' ')}</strong>
                  {' '}{it.item}
                  {it.recipes.size > 1 && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginTop: 1 }}>
                      used in {it.recipes.size} recipes
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>

          <div className="btn-row">
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
            <button className="btn btn-primary" onClick={copyList}>
              {copied ? '✓ Copied!' : 'Copy List'}
            </button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, textAlign: 'right' }}>
            Checked items are excluded from the copy.
          </div>
        </div>
      </div>
    </div>
  );
}
