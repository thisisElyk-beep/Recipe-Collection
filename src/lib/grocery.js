// ── Shared grocery list helpers ───────────────────────────────────

export function parseAmount(str) {
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

export function formatAmount(n) {
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

export function normUnit(u) {
  if (!u) return '';
  const x = u.toLowerCase().replace(/\.$/,'').trim();
  const MAP = { cups:'cup', tablespoons:'tbsp', tablespoon:'tbsp', tbs:'tbsp', teaspoons:'tsp', teaspoon:'tsp', pounds:'lb', pound:'lb', lbs:'lb', ounces:'oz', ounce:'oz', grams:'g', gram:'g', cloves:'clove', cans:'can', packages:'pkg', pkgs:'pkg' };
  return MAP[x] || x;
}

export function normItem(item) {
  return (item||'').toLowerCase().replace(/[-_/]/g,' ').replace(/[^a-z\s]/g,'').replace(/\s+/g,' ').trim();
}

export const CATEGORIES = [
  { name: 'Produce', icon: '🥬', keywords: ['lettuce','spinach','kale','arugula','romaine','tomato','onion','garlic','carrot','celery','potato','sweet potato','pepper','broccoli','cauliflower','zucchini','squash','cucumber','mushroom','avocado','lemon','lime','orange','apple','banana','berry','berries','strawberr','blueberr','grape','herb','parsley','cilantro','basil','dill','mint','rosemary','thyme','sage','scallion','green onion','shallot','ginger','cabbage','brussels','asparagus','corn','pea','bean sprout','radish','beet','cranberr','raisin','date','fruit','vegetable','apricot','peach','pear','mango','pineapple','melon','jalapeno','chile','chili pepper','leek','fennel','eggplant','okra','turnip','parsnip','lemongrass','lime juice','lemon juice'] },
  { name: 'Meat & Seafood', icon: '🥩', keywords: ['chicken','beef','pork','turkey','lamb','sausage','bacon','ham','steak','ground','salmon','shrimp','fish','tuna','cod','tilapia','crab','lobster','scallop','prosciutto','pancetta','chorizo','meatball','ribs','brisket','tenderloin','thigh','breast','wing','fillet','filet'] },
  { name: 'Dairy & Eggs', icon: '🧀', keywords: ['milk','cream','butter','cheese','cheddar','mozzarella','parmesan','feta','ricotta','yogurt','egg','sour cream','half and half','buttermilk','cream cheese','muenster','monterey','gouda','brie','mascarpone','cottage cheese','whipping cream','heavy cream','ghee'] },
  { name: 'Pantry & Dry Goods', icon: '🥫', keywords: ['flour','sugar','salt','pepper','oil','olive oil','vinegar','rice','pasta','noodle','orzo','quinoa','oat','lentil','bean','chickpea','broth','stock','sauce','soy sauce','tomato paste','tomato sauce','diced tomato','canned','can ','baking soda','baking powder','yeast','vanilla','cocoa','chocolate','honey','syrup','maple','cornstarch','breadcrumb','panko','cracker','cereal','nut','almond','walnut','pecan','cashew','peanut','seed','sesame','spice','cumin','paprika','cinnamon','oregano','chili powder','curry','turmeric','bay leaf','coriander','nutmeg','cayenne','garlic powder','onion powder','ketchup','mustard','mayo','mayonnaise','worcestershire','salsa','jam','jelly','peanut butter','tahini','coconut','chocolate chip','powdered sugar','brown sugar','condensed milk','evaporated milk','gelatin','pudding','cornmeal','semolina','wine','sherry','extract','sriracha','chile crisp','fish sauce','hoisin','molasses','shortening','lard','crisco'] },
  { name: 'Bakery & Bread', icon: '🍞', keywords: ['bread','tortilla','bun','roll','bagel','pita','naan','baguette','croissant','crust','pie crust','dough','english muffin'] },
  { name: 'Frozen', icon: '🧊', keywords: ['frozen','ice cream','frozen peas','frozen corn','frozen spinach','frozen berries'] },
];

export const CAT_ORDER = ['Produce','Meat & Seafood','Dairy & Eggs','Bakery & Bread','Frozen','Pantry & Dry Goods','Other'];
export const CAT_ICON = Object.fromEntries(CATEGORIES.map(c => [c.name, c.icon]));
CAT_ICON['Other'] = '📦';

export function categorize(item) {
  const text = normItem(item);
  let best = 'Other', bestLen = 0;
  for (const cat of CATEGORIES) {
    for (const kw of cat.keywords) {
      if (text.includes(kw) && kw.length > bestLen) { best = cat.name; bestLen = kw.length; }
    }
  }
  return best;
}

// Merge a recipe's ingredients into an existing item list (or empty list)
export function mergeIngredientsIntoList(existingItems, recipe) {
  const map = new Map();
  // Seed with existing
  for (const it of (existingItems || [])) {
    map.set(normKey(it.item, it.unit), { ...it, recipes: new Set(it.recipes || []) });
  }
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
  // Serialize recipes Sets back to arrays for Firebase
  return [...map.values()].map(it => ({ ...it, recipes: [...it.recipes] }));
}

// ── Staples ───────────────────────────────────────────────────────
export const PRESET_STAPLES = {
  'Oils & Vinegars': ['olive oil','vegetable oil','canola oil','cooking spray','apple cider vinegar','white vinegar','balsamic vinegar'],
  'Baking': ['all-purpose flour','sugar','brown sugar','powdered sugar','baking soda','baking powder','vanilla extract','cornstarch','yeast'],
  'Spices & Seasoning': ['salt','black pepper','garlic powder','onion powder','cumin','paprika','chili powder','oregano','cinnamon','red pepper flakes','bay leaves','italian seasoning'],
  'Condiments & Sauces': ['ketchup','mustard','mayonnaise','soy sauce','hot sauce','worcestershire sauce','honey','maple syrup','sriracha'],
  'Fridge Basics': ['butter','eggs','milk','parmesan cheese','garlic','onion'],
  'Pantry Basics': ['rice','pasta','chicken broth','canned tomatoes','peanut butter','breadcrumbs','panko'],
};

// Does a grocery item match any active staple?
// One-directional, word-boundary match: the staple phrase must appear
// whole inside the item. "olive oil" staple matches "extra-virgin olive oil"
// item, but "garlic powder" staple does NOT match a "garlic" item, and a
// "garlic" staple does not match "garlic powder"... wait, it would — see
// singular note below. Whole-phrase boundary prevents partial-word hits.
export function singularizeWords(s) {
  return s.split(' ').map(w => w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w).join(' ');
}

// Canonical key for merging duplicate ingredients across recipes
export function normKey(item, unit) {
  return `${singularizeWords(normItem(item))}|${normUnit(unit)}`;
}

// Words that can precede a staple without making it a different product
const DESCRIPTORS = new Set(['fresh','dried','ground','large','small','medium','extra','virgin','pure','organic','whole','raw','plain','light','dark','unsalted','salted','sweetened','unsweetened','reduced','fat','low','sodium','gluten','free','all','purpose','style','packed','granulated','melted','softened','cold','warm','hot','room','temperature']);
// Forms a staple can come in without being a different product
const FORMS = new Set(['clove','head','bulb','leaf','sprig','stalk','stick','slice','piece','cube','pat']);

export function matchesStaple(item, staples) {
  if (!staples || !staples.length) return false;
  const itemWords = singularizeWords(normItem(item)).split(' ').filter(Boolean);
  return staples.some(s => {
    const stWords = singularizeWords(normItem(s)).split(' ').filter(Boolean);
    if (!stWords.length) return false;
    const n = itemWords.length, m = stWords.length;
    // Find the staple phrase as a contiguous run inside the item
    for (let i = 0; i + m <= n; i++) {
      let hit = true;
      for (let j = 0; j < m; j++) if (itemWords[i + j] !== stWords[j]) { hit = false; break; }
      if (!hit) continue;
      const prefix = itemWords.slice(0, i);
      const suffix = itemWords.slice(i + m);
      // Prefix words must all be harmless descriptors ("extra virgin" olive oil — yes;
      // "sea" salt — no). Suffix words must be forms/descriptors ("garlic cloves" — yes;
      // "garlic powder" — no, powder is a different product).
      if (prefix.every(w => DESCRIPTORS.has(w)) && suffix.every(w => FORMS.has(w) || DESCRIPTORS.has(w))) return true;
    }
    return false;
  });
}
