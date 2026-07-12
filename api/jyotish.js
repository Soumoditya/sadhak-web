// Sadhak — Vedic Jyotish engine (authentic, Swiss Ephemeris).
//
// POST body: { year, month, day, hour, minute, second?, tzOffset, lat, lon }
//   - date/time are the LOCAL birth values; tzOffset = hours east of UTC (IST = 5.5)
//   - lat/lon in decimal degrees (N/E positive)
// Returns a full sidereal (Lahiri) kundli: 9 grahas + Lagna, sign/degree,
// nakshatra+pada, whole-sign houses, and AstroSage-style birth attributes.
//
// Ayanamsa: Lahiri. Houses: whole-sign (North-Indian standard).
// Ephemeris: Moshier (built-in, no data files) — accurate to ~1 arc-second.

const sw = require('sweph');
const C = sw.constants;
sw.set_sid_mode(C.SE_SIDM_LAHIRI, 0, 0);

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const SIGNS_HI = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुम्भ', 'मीन'];
const SIGN_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];

// 27 nakshatras with Vimshottari dasha lord, gana, nadi, yoni, deity, symbol.
const NAK = [
  ['Ashwini', 'अश्विनी', 'Ketu', 'Deva', 'Aadi', 'Horse', 'Ashwini Kumaras', 'Horse head'],
  ['Bharani', 'भरणी', 'Venus', 'Manushya', 'Madhya', 'Elephant', 'Yama', 'Yoni'],
  ['Krittika', 'कृत्तिका', 'Sun', 'Rakshasa', 'Antya', 'Sheep', 'Agni', 'Razor'],
  ['Rohini', 'रोहिणी', 'Moon', 'Manushya', 'Antya', 'Serpent', 'Brahma', 'Chariot'],
  ['Mrigashira', 'मृगशिरा', 'Mars', 'Deva', 'Madhya', 'Serpent', 'Soma', 'Deer head'],
  ['Ardra', 'आर्द्रा', 'Rahu', 'Manushya', 'Aadi', 'Dog', 'Rudra', 'Teardrop'],
  ['Punarvasu', 'पुनर्वसु', 'Jupiter', 'Deva', 'Aadi', 'Cat', 'Aditi', 'Bow'],
  ['Pushya', 'पुष्य', 'Saturn', 'Deva', 'Madhya', 'Sheep', 'Brihaspati', 'Flower'],
  ['Ashlesha', 'आश्लेषा', 'Mercury', 'Rakshasa', 'Antya', 'Cat', 'Nagas', 'Serpent'],
  ['Magha', 'मघा', 'Ketu', 'Rakshasa', 'Antya', 'Rat', 'Pitris', 'Throne'],
  ['Purva Phalguni', 'पूर्व फाल्गुनी', 'Venus', 'Manushya', 'Madhya', 'Rat', 'Bhaga', 'Hammock'],
  ['Uttara Phalguni', 'उत्तर फाल्गुनी', 'Sun', 'Manushya', 'Aadi', 'Cow', 'Aryaman', 'Bed'],
  ['Hasta', 'हस्त', 'Moon', 'Deva', 'Aadi', 'Buffalo', 'Savitr', 'Hand'],
  ['Chitra', 'चित्रा', 'Mars', 'Rakshasa', 'Madhya', 'Tiger', 'Vishwakarma', 'Pearl'],
  ['Swati', 'स्वाति', 'Rahu', 'Deva', 'Antya', 'Buffalo', 'Vayu', 'Coral'],
  ['Vishakha', 'विशाखा', 'Jupiter', 'Rakshasa', 'Antya', 'Tiger', 'Indra-Agni', 'Archway'],
  ['Anuradha', 'अनुराधा', 'Saturn', 'Deva', 'Madhya', 'Deer', 'Mitra', 'Lotus'],
  ['Jyeshtha', 'ज्येष्ठा', 'Mercury', 'Rakshasa', 'Aadi', 'Deer', 'Indra', 'Earring'],
  ['Mula', 'मूल', 'Ketu', 'Rakshasa', 'Aadi', 'Dog', 'Nirriti', 'Roots'],
  ['Purva Ashadha', 'पूर्वाषाढ़ा', 'Venus', 'Manushya', 'Madhya', 'Monkey', 'Apas', 'Fan'],
  ['Uttara Ashadha', 'उत्तराषाढ़ा', 'Sun', 'Manushya', 'Antya', 'Mongoose', 'Vishwadevas', 'Tusk'],
  ['Shravana', 'श्रवण', 'Moon', 'Deva', 'Antya', 'Monkey', 'Vishnu', 'Ear'],
  ['Dhanishta', 'धनिष्ठा', 'Mars', 'Rakshasa', 'Madhya', 'Lion', 'Vasus', 'Drum'],
  ['Shatabhisha', 'शतभिषा', 'Rahu', 'Rakshasa', 'Aadi', 'Horse', 'Varuna', 'Empty circle'],
  ['Purva Bhadrapada', 'पूर्व भाद्रपद', 'Jupiter', 'Manushya', 'Aadi', 'Lion', 'Aja Ekapada', 'Sword'],
  ['Uttara Bhadrapada', 'उत्तर भाद्रपद', 'Saturn', 'Manushya', 'Madhya', 'Cow', 'Ahir Budhnya', 'Twins'],
  ['Revati', 'रेवती', 'Mercury', 'Deva', 'Antya', 'Elephant', 'Pushan', 'Fish'],
];

const NAK_SPAN = 360 / 27;      // 13°20'
const PADA_SPAN = NAK_SPAN / 4; // 3°20'

function place(lon) {
  lon = ((lon % 360) + 360) % 360;
  const signIndex = Math.floor(lon / 30);
  const degInSign = lon - signIndex * 30;
  const nIndex = Math.floor(lon / NAK_SPAN);
  const pada = Math.floor((lon - nIndex * NAK_SPAN) / PADA_SPAN) + 1;
  const n = NAK[nIndex];
  return {
    lon: +lon.toFixed(4),
    sign: SIGNS[signIndex], signHi: SIGNS_HI[signIndex], signIndex,
    signLord: SIGN_LORDS[signIndex],
    degree: +degInSign.toFixed(4),
    nakshatra: n[0], nakshatraHi: n[1], nakshatraIndex: nIndex, pada,
    nakLord: n[2],
  };
}

const GRAHAS = [
  ['Sun', 'सूर्य', C.SE_SUN], ['Moon', 'चन्द्र', C.SE_MOON], ['Mars', 'मंगल', C.SE_MARS],
  ['Mercury', 'बुध', C.SE_MERCURY], ['Jupiter', 'गुरु', C.SE_JUPITER], ['Venus', 'शुक्र', C.SE_VENUS],
  ['Saturn', 'शनि', C.SE_SATURN],
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { year, month, day, hour = 0, minute = 0, second = 0, tzOffset = 0, lat, lon } = b;
    if (![year, month, day].every(Number.isFinite) || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: 'Need year, month, day, lat, lon (and time + tzOffset).' });
    }
    // Local clock time → UT decimal hour.
    const utHour = hour + minute / 60 + second / 3600 - tzOffset;
    const jd = sw.julday(year, month, day, utHour, C.SE_GREG_CAL);
    const flags = C.SEFLG_MOSEPH | C.SEFLG_SPEED | C.SEFLG_SIDEREAL;

    // Ascendant (sidereal, whole-sign houses).
    const houses = sw.houses_ex(jd, C.SEFLG_SIDEREAL, lat, lon, 'W');
    const asc = place(houses.data.points[0]);
    const lagnaSign = asc.signIndex;
    const houseOf = (signIndex) => ((signIndex - lagnaSign + 12) % 12) + 1;

    const planets = [];
    for (const [name, nameHi, id] of GRAHAS) {
      const r = sw.calc_ut(jd, id, flags);
      const p = place(r.data[0]);
      planets.push({ name, nameHi, ...p, retro: r.data[3] < 0, house: houseOf(p.signIndex) });
    }
    // Rahu (mean node) + Ketu (opposite). Nodes are always retrograde.
    const rahuLon = sw.calc_ut(jd, C.SE_MEAN_NODE, flags).data[0];
    const rahu = place(rahuLon);
    const ketu = place((rahuLon + 180) % 360);
    planets.push({ name: 'Rahu', nameHi: 'राहु', ...rahu, retro: true, house: houseOf(rahu.signIndex) });
    planets.push({ name: 'Ketu', nameHi: 'केतु', ...ketu, retro: true, house: houseOf(ketu.signIndex) });

    const moon = planets.find((p) => p.name === 'Moon');
    const moonNak = NAK[moon.nakshatraIndex];

    return res.status(200).json({
      meta: { ayanamsa: +sw.get_ayanamsa_ut(jd).toFixed(4), ayanamsaName: 'Lahiri', houseSystem: 'whole-sign', jd },
      lagna: { ...asc, house: 1 },
      planets,
      // AstroSage-style summary (Avakhada basics from the Moon).
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
