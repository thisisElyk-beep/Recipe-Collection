const PROXIES = [
  { makeUrl: url => `https://corsproxy.io/?${encodeURIComponent(url)}`, getHtml: res => res.text() },
  { makeUrl: url => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, getHtml: async res => { const d = await res.json(); return d?.contents; } },
  { makeUrl: url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, getHtml: res => res.text() },
];

async function fetchViaProxy(url) {
  let lastError;
  for (const { makeUrl, getHtml } of PROXIES) {
    try {
      const res = await fetch(makeUrl(url), { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const html = await getHtml(res);
      if (html && html.length > 500) return html;
    } catch (e) { lastError = e; }
  }
  throw new Error(`Could not fetch the page. The site may block scrapers, or try again shortly. (${lastError?.message})`);
}

// ── HTML entity decoding ──────────────────────────────────────────
export function decodeEntities(s) {
  if (!s) return s;
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&rsquo;/g, "'").replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"').replace(/&ldquo;/g, '"')
    .replace(/&ndash;/g, '-').replace(/&mdash;/g, '-');
}

// ── Unicode fraction normalization ────────────────────────────────
const UNICODE_FRACS = { '½':'1/2','¼':'1/4','¾':'3/4','⅓':'1/3','⅔':'2/3','⅛':'1/8','⅜':'3/8','⅝':'5/8','⅞':'7/8' };
function normalizeFractions(str) {
  return str.replace(/[½¼¾⅓⅔⅛⅜⅝⅞]/g, m => UNICODE_FRACS[m]);
}

// ── ISO 8601 duration parser ──────────────────────────────────────
function parseDuration(dur) {
  if (!dur) return null;
  const m = dur.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return dur;
  const totalMins = (parseInt(m[1]||0)*1440)+(parseInt(m[2]||0)*60)+parseInt(m[3]||0);
  if (totalMins <= 0) return null;
  if (totalMins < 60) return `${totalMins} min`;
  const h = Math.floor(totalMins/60), mn = totalMins%60;
  return mn > 0 ? `${h} hr ${mn} min` : `${h} hr`;
}

// ── Ingredient string parser ──────────────────────────────────────
function parseIngredient(str) {
  const text = normalizeFractions(decodeEntities(str.trim())); // normalize BEFORE regex
  const UNITS = 'cups?|tablespoons?|tbsp?\\.?|teaspoons?|tsps?\\.?|pounds?|lbs?\\.?|ounces?|oz\\.?|grams?|g\\.?|kilograms?|kg|liters?|l\\.?|milliliters?|ml|cloves?|slices?|pieces?|cans?|packages?|pkgs?\\.?|bunches?|stalks?|sprigs?|pinch(?:es)?|dash(?:es)?|inches?|quarts?|pints?';
  const FRAC = '(?:\\d+\\s+)?(?:\\d+\\/\\d+|\\d*\\.\\d+|\\d+)';
  const re = new RegExp(`^(${FRAC})?\\s*(${UNITS})?\\s*(.+?)(?:,\\s*(.+))?$`, 'i');
  const match = text.match(re);
  if (match) {
    return {
      amount: match[1]?.trim() || '',
      unit: match[2]?.trim() || null,
      item: match[3]?.trim() || text,
      note: match[4]?.trim() || null,
    };
  }
  return { amount: '', unit: null, item: text, note: null };
}

// ── Instruction parser ────────────────────────────────────────────
function parseInstructions(raw) {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  const steps = []; let num = 1;
  function addStep(text) {
    const clean = decodeEntities(text?.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim() || '');
    if (clean && clean.length > 3) steps.push({ number: num++, instruction: clean });
  }
  for (const item of arr) {
    if (typeof item === 'string') { addStep(item); continue; }
    if (item['@type'] === 'HowToSection' && item.itemListElement) { for (const sub of item.itemListElement) addStep(sub.text||sub.name); continue; }
    addStep(item.text||item.name||item.description);
  }
  return steps;
}

function findRecipe(data) {
  if (!data) return null;
  if (Array.isArray(data)) { for (const d of data) { const r = findRecipe(d); if (r) return r; } return null; }
  const type = data['@type'];
  if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) return data;
  if (data['@graph']) return findRecipe(data['@graph']);
  return null;
}

export async function scrapeRecipeFromUrl(url) {
  const html = await fetchViaProxy(url);
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const recipe = findRecipe(parsed);
      if (!recipe) continue;
      const ingredients = (recipe.recipeIngredient||[]).map(parseIngredient);
      const steps = parseInstructions(recipe.recipeInstructions);
      const tagSources = [
        ...(recipe.keywords ? recipe.keywords.split(/[,;]/) : []),
        ...(Array.isArray(recipe.recipeCategory) ? recipe.recipeCategory : [recipe.recipeCategory||'']),
        ...(Array.isArray(recipe.recipeCuisine) ? recipe.recipeCuisine : [recipe.recipeCuisine||'']),
      ];
      const tags = [...new Set(tagSources.map(t=>t.trim().toLowerCase()).filter(t=>t&&t.length<30))].slice(0,8);
      let image_url = null;
      if (recipe.image) {
        if (typeof recipe.image === 'string') image_url = recipe.image;
        else if (Array.isArray(recipe.image)) image_url = typeof recipe.image[0]==='string' ? recipe.image[0] : recipe.image[0]?.url;
        else if (recipe.image.url) image_url = recipe.image.url;
      }
      return {
        title: decodeEntities(recipe.name||''),
        description: decodeEntities(recipe.description?.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim()||''),
        source_url: url,
        prep_time: parseDuration(recipe.prepTime),
        cook_time: parseDuration(recipe.cookTime),
        total_time: parseDuration(recipe.totalTime),
        servings: recipe.recipeYield ? (Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : recipe.recipeYield).toString() : null,
        ingredients, steps, tags, image_url,
      };
    } catch { continue; }
  }
  throw new Error('No recipe data found on this page. Try the Paste JSON tab instead.');
}
