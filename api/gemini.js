// Serverless proxy for Sadhak AI (Gemini).
//
// WHY: the Gemini API key must NOT ship inside the mobile app (anyone could
// extract it from the APK). The app calls THIS endpoint instead; the key lives
// only in Vercel's environment variables and never leaves the server.
//
// SETUP (one time, in the Vercel dashboard for this project):
//   Settings → Environment Variables → add  GEMINI_KEY = <your Gemini key>
//   (optional) GEMINI_KEY_2 = a second key, tried first; busy models fall back.
//
// The app sends the same body it used to send to Google; we just attach the key.

import { callGemini } from './_gemini.js';

export default async function handler(req, res) {
  // Allow the mobile app (any origin) to call this endpoint.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const r = await callGemini(body);
    res.status(r.status);
    res.setHeader('Content-Type', 'application/json');
    if (r.model) res.setHeader('X-Sadhak-Model', r.model);
    return res.send(r.text);
  } catch (e) {
    return res.status(502).json({ error: 'Upstream request failed', detail: String(e).slice(0, 200) });
  }
}
