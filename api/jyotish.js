// Sadhak — Vedic Jyotish engine (authentic, Swiss Ephemeris).
//
// POST { year, month, day, hour, minute, second?, tzOffset, lat, lon }
//   local birth values; tzOffset = hours east of UTC (IST = 5.5); lat/lon N/E +ve.
// Returns a full sidereal (Lahiri) kundli: D1 + D9 + D10 + Moon chart, Vimshottari
// dasha timeline, yogas, doshas, planetary dignity, and AstroSage-style basics.
// Ayanamsa Lahiri; whole-sign houses; Moshier ephemeris (no data files).

const sw = require('sweph');
const C = sw.constants;
sw.set_sid_mode(C.SE_SIDM_LAHIRI, 0, 0);

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const SIGNS_HI = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुम्भ', 'मीन'];
const SIGN_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];

const NAK = [
  ['Ashwini', 'अश्विनी', 'Ketu', 'Deva', 'Aadi', 'Horse', 'Ashwini Kumaras'],
  ['Bharani', 'भरणी', 'Venus', 'Manushya', 'Madhya', 'Elephant', 'Yama'],
  ['Krittika', 'कृत्तिका', 'Sun', 'Rakshasa', 'Antya', 'Sheep', 'Agni'],
  ['Rohini', 'रोहिणी', 'Moon', 'Manushya', 'Antya', 'Serpent', 'Brahma'],
  ['Mrigashira', 'मृगशिरा', 'Mars', 'Deva', 'Madhya', 'Serpent', 'Soma'],
  ['Ardra', 'आर्द्रा', 'Rahu', 'Manushya', 'Aadi', 'Dog', 'Rudra'],
  ['Punarvasu', 'पुनर्वसु', 'Jupiter', 'Deva', 'Aadi', 'Cat', 'Aditi'],
  ['Pushya', 'पुष्य', 'Saturn', 'Deva', 'Madhya', 'Sheep', 'Brihaspati'],
  ['Ashlesha', 'आश्लेषा', 'Mercury', 'Rakshasa', 'Antya', 'Cat', 'Nagas'],
  ['Magha', 'मघा', 'Ketu', 'Rakshasa', 'Antya', 'Rat', 'Pitris'],
  ['Purva Phalguni', 'पूर्व फाल्गुनी', 'Venus', 'Manushya', 'Madhya', 'Rat', 'Bhaga'],
  ['Uttara Phalguni', 'उत्तर फाल्गुनी', 'Sun', 'Manushya', 'Aadi', 'Cow', 'Aryaman'],
  ['Hasta', 'हस्त', 'Moon', 'Deva', 'Aadi', 'Buffalo', 'Savitr'],
  ['Chitra', 'चित्रा', 'Mars', 'Rakshasa', 'Madhya', 'Tiger', 'Vishwakarma'],
  ['Swati', 'स्वाति', 'Rahu', 'Deva', 'Antya', 'Buffalo', 'Vayu'],
  ['Vishakha', 'विशाखा', 'Jupiter', 'Rakshasa', 'Antya', 'Tiger', 'Indra-Agni'],
  ['Anuradha', 'अनुराधा', 'Saturn', 'Deva', 'Madhya', 'Deer', 'Mitra'],
  ['Jyeshtha', 'ज्येष्ठा', 'Mercury', 'Rakshasa', 'Aadi', 'Deer', 'Indra'],
  ['Mula', 'मूल', 'Ketu', 'Rakshasa', 'Aadi', 'Dog', 'Nirriti'],
  ['Purva Ashadha', 'पूर्वाषाढ़ा', 'Venus', 'Manushya', 'Madhya', 'Monkey', 'Apas'],
  ['Uttara Ashadha', 'उत्तराषाढ़ा', 'Sun', 'Manushya', 'Antya', 'Mongoose', 'Vishwadevas'],
  ['Shravana', 'श्रवण', 'Moon', 'Deva', 'Antya', 'Monkey', 'Vishnu'],
  ['Dhanishta', 'धनिष्ठा', 'Mars', 'Rakshasa', 'Madhya', 'Lion', 'Vasus'],
  ['Shatabhisha', 'शतभिषा', 'Rahu', 'Rakshasa', 'Aadi', 'Horse', 'Varuna'],
  ['Purva Bhadrapada', 'पूर्व भाद्रपद', 'Jupiter', 'Manushya', 'Aadi', 'Lion', 'Aja Ekapada'],
  ['Uttara Bhadrapada', 'उत्तर भाद्रपद', 'Saturn', 'Manushya', 'Madhya', 'Cow', 'Ahir Budhnya'],
  ['Revati', 'रेवती', 'Mercury', 'Deva', 'Antya', 'Elephant', 'Pushan'],
];

const NAK_SPAN = 360 / 27, PADA_SPAN = NAK_SPAN / 4;
const norm = (x) => ((x % 360) + 360) % 360;

function place(lon) {
  lon = norm(lon);
  const signIndex = Math.floor(lon / 30);
  const nIndex = Math.floor(lon / NAK_SPAN);
  const pada = Math.floor((lon - nIndex * NAK_SPAN) / PADA_SPAN) + 1;
  const n = NAK[nIndex];
  return {
    lon: +lon.toFixed(4), sign: SIGNS[signIndex], signHi: SIGNS_HI[signIndex], signIndex,
    signLord: SIGN_LORDS[signIndex], degree: +(lon - signIndex * 30).toFixed(4),
    nakshatra: n[0], nakshatraHi: n[1], nakshatraIndex: nIndex, pada, nakLord: n[2],
  };
}

const GRAHAS = [
  ['Sun', 'सूर्य', C.SE_SUN], ['Moon', 'चन्द्र', C.SE_MOON], ['Mars', 'मंगल', C.SE_MARS],
  ['Mercury', 'बुध', C.SE_MERCURY], ['Jupiter', 'गुरु', C.SE_JUPITER], ['Venus', 'शुक्र', C.SE_VENUS],
  ['Saturn', 'शनि', C.SE_SATURN],
];

// ── Divisional sign index from a full sidereal longitude ──
function navamsaSign(lon) { return Math.floor(norm(lon) / (30 / 9)) % 12; }         // D9 (continuous)
function dasamsaSign(lon) {                                                          // D10
  lon = norm(lon); const s = Math.floor(lon / 30); const part = Math.floor((lon % 30) / 3);
  return (s % 2 === 0) ? (s + part) % 12 : (s + 8 + part) % 12;                      // odd sign: same; even: 9th
}
// Re-house a set of {name, signIndex} onto a given lagna sign (whole-sign).
function houseFrom(lagnaSign) { return (signIndex) => ((signIndex - lagnaSign + 12) % 12) + 1; }

// ── Dignity ──
const EXALT = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const OWN = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
function dignity(name, signIndex) {
  if (EXALT[name] === signIndex) return 'Exalted';
  if (EXALT[name] !== undefined && (EXALT[name] + 6) % 12 === signIndex) return 'Debilitated';
  if (OWN[name] && OWN[name].includes(signIndex)) return 'Own sign';
  return 'Neutral';
}

// ── Vimshottari dasha ──
const DASHA_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const DASHA_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
const YEAR_MS = 365.2425 * 24 * 3600 * 1000;
function addYears(date, years) { return new Date(date.getTime() + years * YEAR_MS); }

function vimshottari(moonLon, birthDate) {
  const nIndex = Math.floor(norm(moonLon) / NAK_SPAN);
  const startLord = NAK[nIndex][2];
  const traversed = (norm(moonLon) % NAK_SPAN) / NAK_SPAN;
  const balance = (1 - traversed) * DASHA_YEARS[startLord];

  let idx = DASHA_ORDER.indexOf(startLord);
  let cursor = addYears(birthDate, -(DASHA_YEARS[startLord] - balance)); // notional maha start
  const maha = [];
  for (let i = 0; i < 9; i++) {
    const lord = DASHA_ORDER[(idx + i) % 9];
    const yrs = DASHA_YEARS[lord];
    const start = i === 0 ? birthDate : cursor;
    const end = addYears(start, i === 0 ? balance : yrs);
    maha.push({ lord, start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10), years: i === 0 ? +balance.toFixed(2) : yrs });
    cursor = end;
  }
  const now = new Date();
  const cur = maha.find((m) => new Date(m.start) <= now && now < new Date(m.end)) || maha[0];
  // Antardasha within the current maha.
  const antar = [];
  const curLordIdx = DASHA_ORDER.indexOf(cur.lord);
  let aCursor = new Date(cur.start);
  const mahaSpanYrs = (new Date(cur.end) - new Date(cur.start)) / YEAR_MS;
  for (let i = 0; i < 9; i++) {
    const lord = DASHA_ORDER[(curLordIdx + i) % 9];
    const aYrs = mahaSpanYrs * DASHA_YEARS[lord] / 120;
    const aEnd = addYears(aCursor, aYrs);
    antar.push({ lord, start: aCursor.toISOString().slice(0, 10), end: aEnd.toISOString().slice(0, 10) });
    aCursor = aEnd;
  }
  const curAntar = antar.find((a) => new Date(a.start) <= now && now < new Date(a.end)) || antar[0];
  return { maha, current: { maha: cur.lord, antar: curAntar.lord, antarList: antar } };
}

// ── Yogas (curated, clear conditions) ──
function detectYogas(P, lagnaSign) {
  const by = {}; P.forEach((p) => { by[p.name] = p; });
  const kendra = (fromSign, sign) => { const h = ((sign - fromSign + 12) % 12) + 1; return [1, 4, 7, 10].includes(h); };
  const yogas = [];
  if (kendra(by.Moon.signIndex, by.Jupiter.signIndex))
    yogas.push({ name: 'Gaja Kesari Yoga', desc: 'Jupiter in a kendra from the Moon — wisdom, respect, and rising fortune.' });
  if (by.Sun.signIndex === by.Mercury.signIndex)
    yogas.push({ name: 'Budha-Aditya Yoga', desc: 'Sun and Mercury together — intelligence, communication, and learning.' });
  if (by.Moon.signIndex === by.Mars.signIndex)
    yogas.push({ name: 'Chandra-Mangala Yoga', desc: 'Moon with Mars — drive, enterprise, and capacity to earn.' });
  // Pancha Mahapurusha: Mars/Mercury/Jupiter/Venus/Saturn own or exalted in a kendra from lagna.
  const MP = { Mars: 'Ruchaka', Mercury: 'Bhadra', Jupiter: 'Hamsa', Venus: 'Malavya', Saturn: 'Sasa' };
  for (const pl of Object.keys(MP)) {
    const p = by[pl]; const d = dignity(pl, p.signIndex);
    if ((d === 'Own sign' || d === 'Exalted') && kendra(lagnaSign, p.signIndex))
      yogas.push({ name: `${MP[pl]} Yoga (Mahapurusha)`, desc: `${pl} strong in a kendra — a hallmark of an exceptional personality.` });
  }
  return yogas;
}

// ── Doshas ──
function detectDoshas(P, lagnaSign, saturnTransitSign) {
  const by = {}; P.forEach((p) => { by[p.name] = p; });
  const houseFromLagna = (sign) => ((sign - lagnaSign + 12) % 12) + 1;
  const marsHouse = houseFromLagna(by.Mars.signIndex);
  const mangal = { present: [1, 2, 4, 7, 8, 12].includes(marsHouse), house: marsHouse };
  // Kaal Sarp: are all 7 planets on one side of the Rahu–Ketu axis?
  const rahu = by.Rahu.lon, ketu = by.Ketu.lon;
  const arc = norm(ketu - rahu);
  const between = (x) => norm(x - rahu) < arc;
  const planets7 = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const side = planets7.map((n) => between(by[n].lon));
  const kaalSarp = { present: side.every(Boolean) || side.every((v) => !v) };
  // Sade Sati: current Saturn transit sign is 12th/1st/2nd from natal Moon sign.
  const fromMoon = ((saturnTransitSign - by.Moon.signIndex + 12) % 12) + 1;
  const sadeSati = { present: [12, 1, 2].includes(fromMoon), phase: fromMoon === 12 ? 'Rising' : fromMoon === 1 ? 'Peak' : fromMoon === 2 ? 'Setting' : null, saturnSign: SIGNS[saturnTransitSign] };
  return { mangal, kaalSarp, sadeSati };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { year, month, day, hour = 0, minute = 0, second = 0, tzOffset = 0, lat, lon } = b;
    if (![year, month, day].every(Number.isFinite) || !Number.isFinite(lat) || !Number.isFinite(lon))
      return res.status(400).json({ error: 'Need year, month, day, lat, lon (and time + tzOffset).' });

    const utHour = hour + minute / 60 + second / 3600 - tzOffset;
    const jd = sw.julday(year, month, day, utHour, C.SE_GREG_CAL);
    const flags = C.SEFLG_MOSEPH | C.SEFLG_SPEED | C.SEFLG_SIDEREAL;

    const houses = sw.houses_ex(jd, C.SEFLG_SIDEREAL, lat, lon, 'W');
    const asc = place(houses.data.points[0]);
    const lagnaSign = asc.signIndex;
    const houseOf = houseFrom(lagnaSign);

    const planets = [];
    for (const [name, nameHi, id] of GRAHAS) {
      const r = sw.calc_ut(jd, id, flags); const p = place(r.data[0]);
      planets.push({ name, nameHi, ...p, retro: r.data[3] < 0, house: houseOf(p.signIndex), dignity: dignity(name, p.signIndex) });
    }
    const rahuLon = sw.calc_ut(jd, C.SE_MEAN_NODE, flags).data[0];
    const rahu = place(rahuLon), ketu = place(rahuLon + 180);
    planets.push({ name: 'Rahu', nameHi: 'राहु', ...rahu, retro: true, house: houseOf(rahu.signIndex), dignity: '—' });
    planets.push({ name: 'Ketu', nameHi: 'केतु', ...ketu, retro: true, house: houseOf(ketu.signIndex), dignity: '—' });

    // Divisional charts: recompute each graha's divisional sign, re-house from that chart's lagna.
    const mk = (signFn) => {
      const lag = signFn(asc.lon);
      const hf = houseFrom(lag);
      return {
        lagnaSignIndex: lag,
        planets: planets.map((p) => { const si = signFn(p.lon); return { name: p.name, nameHi: p.nameHi, sign: SIGNS[si], signIndex: si, retro: p.retro, house: hf(si) }; }),
      };
    };
    const d9 = mk(navamsaSign);
    const d10 = mk(dasamsaSign);
    // Moon chart = D1 placements re-housed from the Moon's sign as lagna.
    const moon = planets.find((p) => p.name === 'Moon');
    const moonHf = houseFrom(moon.signIndex);
    const moonChart = { lagnaSignIndex: moon.signIndex, planets: planets.map((p) => ({ name: p.name, nameHi: p.nameHi, sign: p.sign, signIndex: p.signIndex, retro: p.retro, house: moonHf(p.signIndex) })) };

    // Current Saturn transit (for Sade Sati) + dasha.
    const jdNow = sw.julday(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, new Date().getUTCDate(), 0, C.SE_GREG_CAL);
    const satNowSign = Math.floor(norm(sw.calc_ut(jdNow, C.SE_SATURN, flags).data[0]) / 30);
    const dasha = vimshottari(moon.lon, new Date(Date.UTC(year, month - 1, day)));
    const yogas = detectYogas(planets, lagnaSign);
    const doshas = detectDoshas(planets, lagnaSign, satNowSign);
    const moonNak = NAK[moon.nakshatraIndex];

    return res.status(200).json({
      meta: { ayanamsa: +sw.get_ayanamsa_ut(jd).toFixed(4), ayanamsaName: 'Lahiri', houseSystem: 'whole-sign', jd },
      lagna: { ...asc, house: 1 },
      planets,
      charts: { d9, d10, moon: moonChart },
      dasha, yogas, doshas,
      basics: {
        rashi: moon.sign, rashiHi: moon.signHi, rashiLord: moon.signLord,
        nakshatra: moon.nakshatra, nakshatraHi: moon.nakshatraHi, pada: moon.pada,
        gana: moonNak[3], nadi: moonNak[4], yoni: moonNak[5], deity: moonNak[6],
        nakLord: moon.nakLord, lagna: asc.sign, lagnaHi: asc.signHi,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: 'Jyotish engine error', detail: String(e && e.message || e).slice(0, 200) });
  }
};
