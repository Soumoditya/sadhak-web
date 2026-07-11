// Serverless proxy for Sadhak AI (Gemini).
//
// WHY: the Gemini API key must NOT ship inside the mobile app (anyone could
// extract it from the APK). The app calls THIS endpoint instead; the key lives
// only in Vercel's environment variables and never leaves the server.
//
// SETUP (one time, in the Vercel dashboard for this project):
//   Settings → Environment Variables → add  GEMINI_KEY = <your Gemini key>
//
// The app sends the same body it used to send to Google; we just attach the key.

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

export default async function handler(req, res) {
  // Allow the mobile app (any origin) to call this endpoint.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.GEMINI_KEY;
  if (!key) return res.status(500).json({ error: 'Server is missing GEMINI_KEY' });

  try {
    const upstream = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': key },
      body: JSON.stringify(req.body || {}),
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (e) {
    return res.status(502).json({ error: 'Upstream request failed', detail: String(e).slice(0, 200) });
  }
}
