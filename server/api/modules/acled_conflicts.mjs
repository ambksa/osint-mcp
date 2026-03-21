/**
 * ACLED — Armed Conflict Location & Event Data
 * Requires ACLED_ACCESS_TOKEN (free for researchers at acleddata.com).
 * The primary global conflict tracking dataset.
 */
export const name = 'acled_conflicts';
export const description = 'ACLED armed conflict events — battles, protests, riots, violence against civilians, explosions. Requires ACLED_ACCESS_TOKEN (free at acleddata.com). Query by country.';

export async function run(_ctx, params) {
  const apiKey = process.env.ACLED_ACCESS_TOKEN || process.env.ACLED_API_KEY || '';
  const email = process.env.ACLED_EMAIL || '';

  if (!apiKey) {
    return {
      error: 'ACLED_ACCESS_TOKEN not configured. Register for free at https://acleddata.com/register/ (academic/researcher access).',
      setup: 'Add to server/.env:\n  ACLED_ACCESS_TOKEN=your_key_here\n  ACLED_EMAIL=your_email@example.com',
      events: [],
    };
  }

  const query = (params.query || params.country || '').trim();
  const limit = Number(params.limit || 50);
  const days = Number(params.days || 7);

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

  const url = new URL('https://api.acleddata.com/acled/read');
  url.searchParams.set('key', apiKey);
  if (email) url.searchParams.set('email', email);
  url.searchParams.set('event_date', `${startDate}|${endDate}`);
  url.searchParams.set('event_date_where', 'BETWEEN');
  url.searchParams.set('limit', String(limit));
  if (query) url.searchParams.set('country', query);

  const resp = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`ACLED HTTP ${resp.status}`);
  const data = await resp.json();

  if (!data.success) {
    return { error: data.error?.message || 'ACLED API error', events: [] };
  }

  const events = (data.data || []).map((e) => ({
    eventId: e.event_id_cnty || '',
    eventDate: e.event_date || '',
    eventType: e.event_type || '',
    subEventType: e.sub_event_type || '',
    actor1: e.actor1 || '',
    actor2: e.actor2 || '',
    country: e.country || '',
    admin1: e.admin1 || '',
    admin2: e.admin2 || '',
    location: e.location || '',
    latitude: Number(e.latitude) || null,
    longitude: Number(e.longitude) || null,
    fatalities: Number(e.fatalities) || 0,
    notes: (e.notes || '').slice(0, 300),
    source: e.source || '',
  }));

  return {
    events,
    total: data.count || events.length,
    query: query || 'global',
    period: { start: startDate, end: endDate, days },
    source: 'ACLED',
  };
}
