const CORS_PROXY = 'https://api.allorigins.win/get?url=';

const SYSTEM_PROMPT = `You are a recipe extraction assistant. Given raw HTML from a recipe webpage, extract only the recipe content and return a single valid JSON object — no markdown, no code fences, no explanation, just JSON.`;

const EXTRACTION_PROMPT = (url, html) => `Extract the recipe from the HTML below and return ONLY this JSON structure:

{
  "title": "string",
  "description": "1-2 sentence overview of the dish",
  "source_url": "${url}",
  "prep_time": "string or null",
  "cook_time": "string or null",
  "total_time": "string or null",
  "servings": "string or null",
  "ingredients": [
    { "amount": "string", "unit": "string or null", "item": "string", "note": "string or null" }
  ],
  "steps": [
    { "number": 1, "instruction": "string" }
  ],
  "tags": ["array of relevant tags — cuisine, meal type, dietary labels, main ingredient — max 8"],
  "image_url": "og:image URL or main recipe image URL, or null"
}

Rules:
- Strip all ads, author backstory, affiliate links, newsletter prompts, and unrelated content
- Combine fractional amounts into readable strings (e.g. "1 1/2")
- Each step should be a single, clear action
- Tags should be lowercase

HTML:
${html.slice(0, 80000)}`;

export async function extractRecipeFromUrl(url) {
  const apiKey = localStorage.getItem('claude_api_key');
  if (!apiKey) throw new Error('Claude API key not set. Open Settings to add it.');

  // Fetch page via CORS proxy
  let html;
  try {
    const proxyRes = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
    if (!proxyRes.ok) throw new Error(`Proxy error: ${proxyRes.status}`);
    const data = await proxyRes.json();
    html = data.contents;
  } catch (e) {
    throw new Error(`Could not fetch that URL. The site may block scrapers. (${e.message})`);
  }

  if (!html || html.length < 100) {
    throw new Error('Page content was empty or too short to extract a recipe.');
  }

  // Call Claude API
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: EXTRACTION_PROMPT(url, html) }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude API error (${res.status})`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || '';

  // Strip any accidental markdown fences
  const clean = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();

  try {
    return JSON.parse(clean);
  } catch {
    throw new Error('Failed to parse recipe JSON from Claude response. Try again.');
  }
}
