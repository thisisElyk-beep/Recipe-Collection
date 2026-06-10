import { useState, useMemo } from 'react';

// ── Amount parsing for merging ────────────────────────────────────
function parseAmount(str) {
  if (!str && str !== 0) return null;
  const s = str.toString().trim();
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

function normUnit(u) {
  if (!u) return '';
  const x = u.toLowerCase().replace(/\.$/,'').trim();
  const MAP = { cups:'cup', tablespoons:'tbsp', tablespoon:'tbsp', tbs:'tbsp', teaspoons:'tsp', teaspoon:'tsp', pounds:'lb', pound:'lb', lbs:'lb', ounces:'oz', ounce:'oz', grams:'g', gram:'g', cloves:'clove', cans:'can', packages:'pkg', pkgs:'pkg' };
  return MAP[x] || x;
}

function normItem(item) {
  return (item||'').toLowerCase().replace(/[^a-z\s]/g,'').replace(/\s+/g,' ').trim();
}

// ── Category classification ───────────────────────────────────────
const CATEGORIES = [
  { name: 'Produce', icon: '🥬', keywords: ['lettuce','spinach','kale','arugula','romaine','tomato','onion','garlic','carrot','celery','potato','sweet potato','pepper','broccoli','cauliflower','zucchini','squash','cucumber','mushroom','avocado','lemon','lime','orange','apple','banana','berry','berries','strawberr','blueberr','grape','herb','parsley','cilantro','basil','dill','mint','rosemary','thyme','sage','scallion','green onion','shallot','ginger','cabbage','brussels','asparagus','corn','pea','bean sprout','radish','beet','cranberr','raisin','date','fruit','vegetable','apricot','peach','pear','mango','pineapple','melon','jalapeno','chile','chili pepper','leek','fennel','eggplant','okra','turnip','parsnip','lemongrass','lime juice','lemon juice'] },
  { name: 'Meat & Seafood', icon: '🥩', keywords: ['chicken','beef','pork','turkey','lamb','sausage','bacon','ham','steak','ground','salmon','shrimp','fish','tuna','cod','tilapia','crab','lobster','scallop','prosciutto','pancetta','chorizo','meatball','ribs','brisket','tenderloin','thigh','breast','wing','fillet','filet'] },
  { name: 'Dairy & Eggs', icon: '🧀', keywords: ['milk','cream','butter','cheese','cheddar','mozzarella','parmesan','feta','ricotta','yogurt','egg','sour cream','half and half','buttermilk','cream cheese','muenster','monterey','gouda','brie','mascarpone','cottage cheese','whipping cream','heavy cream','ghee'] },
  { name: 'Pantry & Dry Goods', icon: '🥫', keywords: ['flour','sugar','salt','pepper','oil','olive oil','vinegar','rice','pasta','noodle','orzo','quinoa','oat','lentil','bean','chickpea','broth','stock','sauce','soy sauce','tomato paste','tomato sauce','diced tomato','canned','can ','baking soda','baking powder','yeast','vanilla','cocoa','chocolate','honey','syrup','maple','cornstarch','breadcrumb','panko','cracker','cereal','nut','almond','walnut','pecan','cashew','peanut','seed','sesame','spice','cumin','paprika','cinnamon','oregano','chili powder','curry','turmeric','bay leaf','coriander','nutmeg','cayenne','garlic powder','onion powder','ketchup','mustard','mayo','mayonnaise','worcestershire','salsa','jam','jelly','peanut butter','tahini','coconut','raisin','chocolate chip','powdered sugar','brown sugar','condensed milk','evaporated milk','gelatin','pudding','cornmeal','semolina','wine','sherry','extract','sriracha','chile crisp','fish sauce','hoisin','molasses','shortening','lard','crisco'] },
  { name: 'Bakery & Bread', icon: '🍞', keywords: ['bread','tortilla','bun','roll','bagel','pita','naan','baguette','croissant','crust','pie crust','dough','english muffin'] },
  { name: 'Frozen', icon: '🧊', keywords: ['frozen','ice cream','frozen peas','frozen corn','frozen spinach','frozen berries'] },
];

function categorize(item) {
  const text = normItem(item);
  // Score each category by longest keyword match
  let best = 'Other', bestLen = 0;
  for (const cat of CATEGORIES) {
    for (const kw of cat.keywords) {
      if (text.includes(kw) && kw.length > bestLen) {
        best = cat.name;
        bestLen = kw.length;
      }
    }
  }
  return best;
}

const CAT_ORDER = ['Produce','Meat & Seafood','Dairy & Eggs','Bakery & Bread','Frozen','Pantry & Dry Goods','Other'];
const CAT_ICON = Object.fromEntries(CATEGORIES.map(c => [c.name, c.icon]));
CAT_ICON['Other'] = '📦';

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

export default function ShoppingListModal({ recipes, onClose }) {
  const items = useMemo(() => buildShoppingList(recipes), [recipes]);
  // Persist checked state across reopens, keyed by item identity
  const storageKey = 'shoppingChecked';
  const [checked, setChecked] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return new Set(saved);
    } catch { return new Set(); }
  });
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 520, maxHeight: '88vh' }}>
        <div className="modal-header">
          <h2>Shopping List</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">

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
                    {it.recipes.size > 1 && <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginTop: 1 }}>used in {it.recipes.size} recipes</span>}
                  </span>
                </label>
              ); })}
            </div>
          ))}

          <div className="btn-row">
            <button className="btn btn-secondary" onClick={clearChecked}>Uncheck All</button>
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
            <button className="btn btn-primary" onClick={copyList}>{copied ? '✓ Copied!' : 'Copy List'}</button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, textAlign: 'right' }}>
            Checked items are excluded from the copy.
          </div>
        </div>
      </div>
    </div>
  );
}
