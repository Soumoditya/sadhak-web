// Sadhak — Jyotish predictions (transits + AI interpretation).
//
// POST { kundli, period: 'daily'|'weekly'|'monthly'|'yearly', name? }
//   kundli = the natal chart from /api/jyotish (needs planets[].sign/signIndex + basics).
// We compute TODAY's real sidereal transits (Swiss Ephemeris), summarise them
// against the natal Moon (Chandra lagna), then ask the Gemini astrologer to
// interpret — returning structured guidance. Calculations are exact; the
// interpretation is guidance grounded in the chart, not guaranteed fact.

const sw = require('sweph');
const C = sw.constants;
sw.set_sid_mode(C.SE_SIDM_LAHIRI, 0, 0);

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const norm = (x) => ((x % 360) + 360) % 360;
const GRAHAS = [['Sun', C.SE_SUN], ['Moon', C.SE_MOON], ['Mars', C.SE_MARS], ['Mercury', C.SE_MERCURY], ['Jupiter', C.SE_JUPITER], ['Venus', C.SE_VENUS], ['Saturn', C.SE_SATURN]];

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

function currentTransits() {
  const now = new Date();
  const jd = sw.julday(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(),
    now.getUTCHours() + now.getUTCMinutes() / 60, C.SE_GREG_CAL);
  const flags = C.SEFLG_MOSEPH | C.SEFLG_SPEED | C.SEFLG_SIDEREAL;
  const out = {};
  for (const [name, id] of GRAHAS) {
    const r = sw.calc_ut(jd, id, flags);
    out[name] = { signIndex: Math.floor(norm(r.data[0]) / 30), retro: r.data[3] < 0 };
  }
  const rahu = Math.floor(norm(sw.calc_ut(jd, C.SE_MEAN_NODE, flags).data[0]) / 30);
  out.Rahu = { signIndex: rahu, retro: true };
  out.Ketu = { signIndex: (rahu + 6) % 12, retro: true };
  return out;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const key = process.env.GEMINI_KEY;
  if (!key) return res.status(500).json({ error: 'Server missing GEMINI_KEY' });

  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { kundli, period = 'daily', name } = b;
    if (!kundli || !kundli.planets || !kundli.basics) return res.status(400).json({ error: 'Need the natal kundli.' });

    const moonSign = kundli.planets.find((p) => p.name === 'Moon')?.signIndex ?? 0;
    const tr = currentTransits();
    const fromMoon = (si) => ((si - moonSign + 12) % 12) + 1;
    const transitLines = Object.entries(tr).map(([n, t]) =>
      `${n} in ${SIGNS[t.signIndex]} (house ${fromMoon(t.signIndex)} from Moon)${t.retro ? ', retrograde' : ''}`).join('; ');

    const natalLine = kundli.planets.map((p) => `${p.name} in ${p.sign} (h${p.house})`).join(', ');
    const dashaLine = kundli.dasha ? `Mahadasha ${kundli.dasha.current.maha}, Antardasha ${kundli.dasha.current.antar}.` : '';
    const today = new Date().toISOString().slice(0, 10);

    const prompt = `You are a learned, warm Vedic astrologer. Give ${period} guidance for ${name || 'this person'} for ${today}.
NATAL (sidereal, Lahiri): Lagna ${kundli.basics.lagna}; Moon rashi ${kundli.basics.rashi}; Nakshatra ${kundli.basics.nakshatra} pada ${kundli.basics.pada}. Planets: ${natalLine}. ${dashaLine}
CURRENT TRANSITS: ${transitLines}.
Interpret the transits against this natal chart for the ${period} ahead. Be specific, practical, grounded, and kind — never fatalistic or fear-mongering. Base it ONLY on the placements given.
Return STRICT JSON with these keys (arrays are short strings, 2-5 items):
{"overview": "2-3 warm sentences", "goodFor": ["..."], "avoid": ["..."], "doToday": ["..."], "remedies": ["simple dharmic remedies: mantra/daan/fasting"], "transit": "1-2 sentences on the key transit now", "lucky": {"color": "", "number": "", "direction": ""}}`;

    const g = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048, responseMimeType: 'application/json' },
      }),
    });
    if (!g.ok) {
      const t = await g.text();
      return res.status(g.status === 429 ? 429 : 502).json({ error: g.status === 429 ? 'Astrologer is busy — try again shortly.' : 'AI error', detail: t.slice(0, 160) });
    }
    const data = await g.json();
    const txt = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '{}';
    let parsed; try { parsed = JSON.parse(txt); } catch { parsed = { overview: txt }; }

    return res.status(200).json({
      period, date: today,
      transitSummary: transitLines,
      ...parsed,
    });
  } catch (e) {
    return res.status(500).json({ error: 'Prediction engine error', detail: String(e && e.message || e).slice(0, 200) });
  }
};
