/**
 * Country Risk Signals — raw OSINT signals per country from all working feeds.
 *
 * Does NOT compute scores or make judgments. Returns raw evidence:
 *  - News headlines mentioning the country
 *  - Defense/military articles
 *  - Travel advisory level
 *  - Embassy alerts
 *  - Disaster events
 *  - Health alerts
 *  - Threat keyword counts
 *
 * The agent decides what matters and how to weight it.
 * Use query param to filter to specific country/region.
 */

export const name = 'country_risk_signals';
export const description = 'Raw OSINT signals per country from 9 feeds (news, defense, travel advisories, embassy, disasters, health, cyber). No scoring — returns evidence for agent analysis. Use query to filter by country.';

const COUNTRIES = {
  US: { name: 'United States', keywords: ['united states', 'usa', 'america', 'washington', 'pentagon', 'white house'] },
  RU: { name: 'Russia', keywords: ['russia', 'moscow', 'kremlin', 'putin', 'russian'] },
  CN: { name: 'China', keywords: ['china', 'beijing', 'xi jinping', 'prc', 'chinese', 'south china sea'] },
  UA: { name: 'Ukraine', keywords: ['ukraine', 'kyiv', 'zelensky', 'donbas', 'crimea', 'ukrainian'] },
  IR: { name: 'Iran', keywords: ['iran', 'tehran', 'khamenei', 'irgc', 'iranian', 'persian gulf'] },
  IL: { name: 'Israel', keywords: ['israel', 'tel aviv', 'netanyahu', 'idf', 'gaza', 'hamas', 'hezbollah', 'west bank'] },
  TW: { name: 'Taiwan', keywords: ['taiwan', 'taipei', 'taiwanese', 'taiwan strait'] },
  KP: { name: 'North Korea', keywords: ['north korea', 'pyongyang', 'kim jong', 'dprk'] },
  SA: { name: 'Saudi Arabia', keywords: ['saudi', 'riyadh', 'mbs', 'aramco', 'saudi arabia'] },
  AE: { name: 'UAE', keywords: ['uae', 'united arab emirates', 'abu dhabi', 'dubai', 'emirati'] },
  TR: { name: 'Turkey', keywords: ['turkey', 'türkiye', 'ankara', 'erdogan', 'turkish', 'istanbul'] },
  EG: { name: 'Egypt', keywords: ['egypt', 'cairo', 'egyptian', 'suez', 'sinai'] },
  IN: { name: 'India', keywords: ['india', 'delhi', 'modi', 'indian', 'kashmir', 'mumbai'] },
  PK: { name: 'Pakistan', keywords: ['pakistan', 'islamabad', 'pakistani', 'karachi'] },
  SY: { name: 'Syria', keywords: ['syria', 'damascus', 'syrian', 'assad'] },
  YE: { name: 'Yemen', keywords: ['yemen', 'sanaa', 'houthi', 'yemeni', 'aden'] },
  IQ: { name: 'Iraq', keywords: ['iraq', 'baghdad', 'iraqi', 'kurdistan'] },
  LB: { name: 'Lebanon', keywords: ['lebanon', 'beirut', 'lebanese'] },
  AF: { name: 'Afghanistan', keywords: ['afghanistan', 'kabul', 'taliban', 'afghan'] },
  SD: { name: 'Sudan', keywords: ['sudan', 'khartoum', 'sudanese', 'rsf', 'darfur'] },
  SO: { name: 'Somalia', keywords: ['somalia', 'mogadishu', 'somali', 'al-shabaab'] },
  MM: { name: 'Myanmar', keywords: ['myanmar', 'burma', 'burmese', 'rohingya'] },
  LY: { name: 'Libya', keywords: ['libya', 'tripoli', 'libyan', 'benghazi'] },
  CD: { name: 'DR Congo', keywords: ['congo', 'kinshasa', 'congolese', 'drc'] },
  HT: { name: 'Haiti', keywords: ['haiti', 'port-au-prince', 'haitian'] },
  VE: { name: 'Venezuela', keywords: ['venezuela', 'caracas', 'maduro', 'venezuelan'] },
  NG: { name: 'Nigeria', keywords: ['nigeria', 'lagos', 'abuja', 'nigerian', 'boko haram'] },
  ET: { name: 'Ethiopia', keywords: ['ethiopia', 'addis ababa', 'ethiopian', 'tigray'] },
  ML: { name: 'Mali', keywords: ['mali', 'bamako', 'malian', 'sahel'] },
  BF: { name: 'Burkina Faso', keywords: ['burkina faso', 'ouagadougou', 'burkinabe'] },
  NE: { name: 'Niger', keywords: ['niger', 'niamey', 'nigerien', 'niger republic'] },
  MZ: { name: 'Mozambique', keywords: ['mozambique', 'maputo', 'mozambican'] },
  CM: { name: 'Cameroon', keywords: ['cameroon', 'yaounde', 'cameroonian'] },
  KE: { name: 'Kenya', keywords: ['kenya', 'nairobi', 'kenyan'] },
  ZA: { name: 'South Africa', keywords: ['south africa', 'johannesburg', 'pretoria', 'cape town'] },
  MX: { name: 'Mexico', keywords: ['mexico', 'mexican', 'mexico city', 'cartel'] },
  CO: { name: 'Colombia', keywords: ['colombia', 'bogota', 'colombian'] },
  BR: { name: 'Brazil', keywords: ['brazil', 'brasilia', 'brazilian', 'sao paulo'] },
  AR: { name: 'Argentina', keywords: ['argentina', 'buenos aires', 'argentine'] },
  PE: { name: 'Peru', keywords: ['peru', 'lima', 'peruvian'] },
  CL: { name: 'Chile', keywords: ['chile', 'santiago', 'chilean'] },
  QA: { name: 'Qatar', keywords: ['qatar', 'doha', 'qatari'] },
  KW: { name: 'Kuwait', keywords: ['kuwait', 'kuwaiti'] },
  BH: { name: 'Bahrain', keywords: ['bahrain', 'manama', 'bahraini'] },
  OM: { name: 'Oman', keywords: ['oman', 'muscat', 'omani'] },
  JO: { name: 'Jordan', keywords: ['jordan', 'amman', 'jordanian'] },
  PH: { name: 'Philippines', keywords: ['philippines', 'manila', 'filipino'] },
  TH: { name: 'Thailand', keywords: ['thailand', 'bangkok', 'thai'] },
  ID: { name: 'Indonesia', keywords: ['indonesia', 'jakarta', 'indonesian'] },
  MY: { name: 'Malaysia', keywords: ['malaysia', 'kuala lumpur', 'malaysian'] },
  VN: { name: 'Vietnam', keywords: ['vietnam', 'hanoi', 'vietnamese'] },
  BD: { name: 'Bangladesh', keywords: ['bangladesh', 'dhaka', 'bangladeshi'] },
  GB: { name: 'United Kingdom', keywords: ['britain', 'uk', 'london', 'british', 'england'] },
  FR: { name: 'France', keywords: ['france', 'paris', 'macron', 'french'] },
  DE: { name: 'Germany', keywords: ['germany', 'berlin', 'german'] },
  JP: { name: 'Japan', keywords: ['japan', 'tokyo', 'japanese'] },
  KR: { name: 'South Korea', keywords: ['south korea', 'seoul', 'korean'] },
  AU: { name: 'Australia', keywords: ['australia', 'canberra', 'australian', 'sydney'] },
  CA: { name: 'Canada', keywords: ['canada', 'ottawa', 'canadian', 'toronto'] },
  PL: { name: 'Poland', keywords: ['poland', 'warsaw', 'polish'] },
  RO: { name: 'Romania', keywords: ['romania', 'bucharest', 'romanian'] },
  IT: { name: 'Italy', keywords: ['italy', 'rome', 'italian'] },
  ES: { name: 'Spain', keywords: ['spain', 'madrid', 'spanish'] },
  NL: { name: 'Netherlands', keywords: ['netherlands', 'amsterdam', 'dutch', 'the hague'] },
  SE: { name: 'Sweden', keywords: ['sweden', 'stockholm', 'swedish'] },
  FI: { name: 'Finland', keywords: ['finland', 'helsinki', 'finnish'] },
  NO: { name: 'Norway', keywords: ['norway', 'oslo', 'norwegian'] },
  GR: { name: 'Greece', keywords: ['greece', 'athens', 'greek'] },
  SG: { name: 'Singapore', keywords: ['singapore', 'singaporean'] },
  NZ: { name: 'New Zealand', keywords: ['new zealand', 'wellington', 'auckland'] },
  IE: { name: 'Ireland', keywords: ['ireland', 'dublin', 'irish'] },
  CH: { name: 'Switzerland', keywords: ['switzerland', 'zurich', 'bern', 'swiss'] },
};

const THREAT_WORDS = [
  'attack', 'strike', 'bomb', 'missile', 'drone', 'war', 'killed', 'dead',
  'explosion', 'shooting', 'conflict', 'invasion', 'airstrike', 'airstrikes',
  'casualties', 'troops', 'military operation', 'escalation', 'sanctions',
  'blockade', 'siege', 'coup', 'assassination', 'hostage', 'terror',
  'nuclear', 'chemical', 'biological', 'crisis', 'emergency',
];

function matchCountry(text) {
  const lower = text.toLowerCase();
  const matches = [];
  for (const [code, { keywords }] of Object.entries(COUNTRIES)) {
    if (keywords.some((kw) => lower.includes(kw))) matches.push(code);
  }
  return matches;
}

function extractThreats(text) {
  const lower = text.toLowerCase();
  return THREAT_WORDS.filter((w) => lower.includes(w));
}

function parseAdvisoryLevel(title) {
  const m = title.match(/level\s*(\d)/i);
  return m ? Number(m[1]) : 0;
}

export async function run(ctx, params) {
  const origin = ctx.origin;
  const query = (params.query || '').trim();
  const fetchMod = async (mod, modParams = {}) => {
    try {
      const qs = new URLSearchParams({ module: mod, format: 'json' });
      if (Object.keys(modParams).length) qs.set('params', JSON.stringify(modParams));
      const resp = await fetch(`${origin}/api/headless?${qs}`, { signal: AbortSignal.timeout(15000) });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data?.modules?.[mod]?.data || data?.modules?.[mod] || null;
    } catch { return null; }
  };

  // Fetch all feeds in parallel
  const [newsData, defenseData, travelData, embassyData, gdacsData,
    healthData, cyberData, ransomData, cisaData] = await Promise.all([
    fetchMod('news_rss', { max_total: 300 }),
    fetchMod('defense_news'),
    fetchMod('travel_advisories', { query: '' }),
    fetchMod('embassy_alerts'),
    fetchMod('natural_events_gdacs', { limit: 100 }),
    fetchMod('health_advisories', { limit: 50 }),
    fetchMod('cyber_threats'),
    fetchMod('ransomware_posts', { limit: 50 }),
    fetchMod('cisa_kev', { query: 'all', limit: 50 }),
  ]);

  // Build per-country signal buckets
  const signals = {};
  for (const code of Object.keys(COUNTRIES)) {
    signals[code] = {
      region: code,
      country: COUNTRIES[code].name,
      newsHeadlines: [],
      threatKeywords: [],
      defenseArticles: [],
      travelAdvisory: null,
      embassyAlerts: [],
      disasterAlerts: [],
      healthAlerts: [],
    };
  }

  // 1. News headlines
  for (const item of (newsData?.items || [])) {
    const text = `${item.title || ''} ${item.description || ''}`;
    const threats = extractThreats(text);
    for (const code of matchCountry(text)) {
      signals[code].newsHeadlines.push({
        title: item.title || '',
        source: item.feedTitle || item.source || '',
        date: item.pubDate || item.isoDate || '',
        threatWords: threats,
      });
      if (threats.length) signals[code].threatKeywords.push(...threats);
    }
  }

  // 2. Defense news
  for (const item of (defenseData?.items || [])) {
    const text = `${item.title || ''} ${item.description || ''}`;
    for (const code of matchCountry(text)) {
      signals[code].defenseArticles.push({
        title: item.title || '',
        source: item.feedTitle || item.source || '',
        date: item.pubDate || item.isoDate || '',
      });
    }
  }

  // 3. Travel advisories
  for (const item of (travelData?.items || [])) {
    const title = item.title || item.name || '';
    const level = parseAdvisoryLevel(title);
    for (const code of matchCountry(title)) {
      if (!signals[code]) continue;
      const existing = signals[code].travelAdvisory;
      if (!existing || level > (existing.level || 0)) {
        signals[code].travelAdvisory = {
          title,
          level,
          levelText: level === 4 ? 'Do Not Travel' : level === 3 ? 'Reconsider Travel'
            : level === 2 ? 'Exercise Increased Caution' : level === 1 ? 'Exercise Normal Precautions' : 'Unknown',
          source: item.feedTitle || item.source || '',
        };
      }
    }
  }

  // 4. Embassy alerts
  for (const item of (embassyData?.items || [])) {
    const text = `${item.title || ''} ${item.country || ''} ${item.description || ''}`;
    for (const code of matchCountry(text)) {
      signals[code].embassyAlerts.push({
        title: item.title || '',
        date: item.pubDate || item.isoDate || '',
      });
    }
  }

  // 5. GDACS disasters
  for (const alert of (gdacsData?.alerts || gdacsData?.events || [])) {
    const text = `${alert.title || ''} ${alert.name || ''} ${alert.country || ''} ${alert.description || ''}`;
    for (const code of matchCountry(text)) {
      signals[code].disasterAlerts.push({
        title: alert.title || alert.name || '',
        type: alert.type || alert.eventtype || '',
        severity: alert.severity || alert.alertlevel || '',
      });
    }
  }

  // 6. Health alerts
  for (const item of (healthData?.items || [])) {
    const text = `${item.title || ''} ${item.description || ''}`;
    for (const code of matchCountry(text)) {
      signals[code].healthAlerts.push({
        title: item.title || '',
        source: item.feedTitle || item.source || '',
      });
    }
  }

  // Global cyber context (not per-country)
  const globalCyber = {
    activeThreats: (cyberData?.threats || []).length,
    ransomwarePosts: (ransomData?.posts || []).length,
    cisaVulnerabilities: (cisaData?.vulnerabilities || []).length,
  };

  // Add summary counts to each country
  for (const s of Object.values(signals)) {
    s.summary = {
      newsCount: s.newsHeadlines.length,
      threatWordCount: s.threatKeywords.length,
      defenseCount: s.defenseArticles.length,
      advisoryLevel: s.travelAdvisory?.level || null,
      embassyCount: s.embassyAlerts.length,
      disasterCount: s.disasterAlerts.length,
      healthCount: s.healthAlerts.length,
    };
    // Dedupe threat keywords
    s.threatKeywords = [...new Set(s.threatKeywords)];
  }

  // Sort by total signal volume
  let results = Object.values(signals).sort((a, b) => {
    const aTotal = a.summary.newsCount + a.summary.defenseCount * 2 + a.summary.embassyCount * 3
      + (a.summary.advisoryLevel || 0) * 5 + a.summary.disasterCount + a.summary.threatWordCount;
    const bTotal = b.summary.newsCount + b.summary.defenseCount * 2 + b.summary.embassyCount * 3
      + (b.summary.advisoryLevel || 0) * 5 + b.summary.disasterCount + b.summary.threatWordCount;
    return bTotal - aTotal;
  });

  // Filter by query
  if (query) {
    const ql = query.toLowerCase();
    results = results.filter((s) =>
      s.region.toLowerCase() === ql
      || s.country.toLowerCase().includes(ql)
      || COUNTRIES[s.region]?.keywords.some((kw) => kw.includes(ql))
    );
  }

  // Strip empty countries unless queried specifically
  if (!query) {
    results = results.filter((s) => {
      const sum = s.summary;
      return sum.newsCount > 0 || sum.defenseCount > 0 || sum.advisoryLevel >= 2
        || sum.embassyCount > 0 || sum.disasterCount > 0 || sum.healthCount > 0;
    });
  }

  return {
    countries: results,
    totalCountriesTracked: Object.keys(COUNTRIES).length,
    totalWithSignals: results.length,
    globalCyber,
    feedStatus: {
      news: (newsData?.items || []).length,
      defense: (defenseData?.items || []).length,
      travelAdvisories: (travelData?.items || []).length,
      embassy: (embassyData?.items || []).length,
      disasters: (gdacsData?.alerts || gdacsData?.events || []).length,
      health: (healthData?.items || []).length,
      cyber: (cyberData?.threats || []).length,
      ransomware: (ransomData?.posts || []).length,
      cisa: (cisaData?.vulnerabilities || []).length,
    },
    source: 'country_risk_signals (raw evidence from 9 feeds, no scoring)',
  };
}
