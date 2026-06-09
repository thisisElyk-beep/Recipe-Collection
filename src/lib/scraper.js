const CORS_PROXY = 'https://api.allorigins.win/get?url=';

// ── ISO 8601 duration parser ──────────────────────────────────────
function parseDuration(dur) {
  if (!dur) return null;
  const m = dur.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return dur;
  const totalMins = (parseInt(m[1] || 0) * 1440) + (parseInt(m[2] || 0) * 60) + parseInt(m[3] || 0);
  if (totalMins <= 0) return null;
  if (totalMins < 60) return `${totalMins} min`;
  const h = Math.floor(totalMins / 60), mn = totalMins % 60;
  return mn > 0 ? `${h} hr ${mn} min` : `${h} hr`;
}

// ── Ingredient string parser ──────────────────────────────────────
function parseIngredient(str) {
  const text = str.trim();
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
  const steps = [];
  let num = 1;

  function addStep(text) {
    const clean = text?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (clean && clean.length > 3) steps.push({ number: num++, instruction: clean });
  }

  for (const item of arr) {
    if (typeof item === 'string') { addStep(item); continue; }
    if (item['@type'] === 'HowToSection' && item.itemListElement) {
      for (const sub of item.itemListElement) addStep(sub.text || sub.name);
      continue;
    }
    addStep(item.text || item.name || item.description);
  }
  return steps;
}

// ── Find Recipe object in JSON-LD ─────────────────────────────────
function findRecipe(data) {
  if (!data) return null;
  if (Array.isArray(data)) {
    for (const d of data) { const r = findRecipe(d); if (r) return r; }
    return null;
  }
  const type = data['@type'];
  if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) return data;
  if (data['@graph']) return findRecipe(data['@graph']);
  return null;
}

// ── Main scraper ──────────────────────────────────────────────────
export async function scrapeRecipeFromUrl(url) {
  let html;
  try {
    const res = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error(`Proxy error ${res.status}`);
    const data = await res.json();
    html = data.contents;
  } catch (e) {
    throw new Error(`Could not fetch that page. The site may block scrapers. (${e.message})`);
  }

  if (!html || html.length < 200) {
    throw new Error('Page returned empty content.');
  }

  // Extract all JSON-LD script blocks
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const recipe = findRecipe(parsed);
      if (!recipe) continue;

      // Build ingredient list
      const ingredients = (recipe.recipeIngredient || []).map(parseIngredient);

      // Build steps
      const steps = parseInstructions(recipe.recipeInstructions);

      // Tags from keywords, category, cuisine
      const tagSources = [
        ...(recipe.keywords ? recipe.keywords.split(/[,;]/) : []),
        ...(Array.isArray(recipe.recipeCategory) ? recipe.recipeCategory : [recipe.recipeCategory || '']),
        ...(Array.isArray(recipe.recipeCuisine) ? recipe.recipeCuisine : [recipe.recipeCuisine || '']),
      ];
      const tags = [...new Set(tagSources.map(t => t.trim().toLowerCase()).filter(t => t && t.length < 30))].slice(0, 8);

      // Image
      let image_url = null;
      if (recipe.image) {
        if (typeof recipe.image === 'string') image_url = recipe.image;
        else if (Array.isArray(recipe.image)) image_url = typeof recipe.image[0] === 'string' ? recipe.image[0] : recipe.image[0]?.url;
        else if (recipe.image.url) image_url = recipe.image.url;
      }

      return {
        title: recipe.name || '',
        description: recipe.description?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || '',
        source_url: url,
        prep_time: parseDuration(recipe.prepTime),
        cook_time: parseDuration(recipe.cookTime),
        total_time: parseDuration(recipe.totalTime),
        servings: recipe.recipeYield
          ? (Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : recipe.recipeYield).toString()
          : null,
        ingredients,
        steps,
        tags,
        image_url,
      };
    } catch {
      continue;
    }
  }

  throw new Error('No recipe data found on this page. The site may not support automatic extraction — try the "Paste JSON" tab instead.');
}
