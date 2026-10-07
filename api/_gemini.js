// Shared Gemini caller with fallback. Busy or retired models (429, 500, 503,
// 404) fall through to the next model, and to a second key when one is set.
// Keys live only in Vercel env: GEMINI_KEY_2 (tried first, if set) and GEMINI_KEY.
const MODELS = [
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
];
const RETRY = new Set([404, 429, 500, 502, 503, 504]);

async function callGemini(body, { models = MODELS, timeoutMs = 25000 } = {}) {
  const keys = [process.env.GEMINI_KEY_2, process.env.GEMINI_KEY].filter(Boolean);
  if (!keys.length) return { status: 500, text: JSON.stringify({ error: { message: 'Server is missing GEMINI_KEY' } }) };
  let last = { status: 503, text: JSON.stringify({ error: { message: 'All models are busy. Please try again in a minute.' } }) };
  for (const model of models) {
    for (const key of keys) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-goog-api-key': key },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
        const text = await r.text();
        if (r.ok) return { status: 200, text, model };
        last = { status: r.status, text };
        if (!RETRY.has(r.status)) return last;
      } catch (e) {
        last = { status: 504, text: JSON.stringify({ error: { message: `Upstream timeout on ${model}` } }) };
      } finally {
        clearTimeout(timer);
      }
    }
  }
  return last;
}

module.exports = { callGemini, MODELS };
