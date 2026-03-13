const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

// GET /api/history
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const playerId = url.searchParams.get('player_id');

    let results;
    if (playerId) {
      ({ results } = await context.env.DB.prepare(
        'SELECT * FROM player_match_history WHERE player_id = ? ORDER BY match_date DESC'
      ).bind(playerId).all());
    } else {
      ({ results } = await context.env.DB.prepare(
        'SELECT * FROM player_match_history ORDER BY match_date DESC'
      ).all());
    }

    return new Response(JSON.stringify(results), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}

// POST /api/history — Bulk insert, accepts { records: [...] }
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const records = body.records || body.entries || [];

    if (!records || records.length === 0) {
      return new Response(JSON.stringify({ ok: true, inserted: 0 }), { headers: CORS });
    }

    const SQL = `INSERT INTO player_match_history (player_id, player_name, match_id, match_date, position_code, played_minutes, rating, hrf_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(player_id, match_id) DO NOTHING`;

    // D1 batch: each item must be a separately prepared statement
    const CHUNK = 80;
    let inserted = 0;

    for (let i = 0; i < records.length; i += CHUNK) {
      const chunk = records.slice(i, i + CHUNK);
      const batch = chunk.map(r =>
        context.env.DB.prepare(SQL).bind(
          r.playerId || '',
          r.playerName || '',
          r.matchId || '',
          r.matchDate || '',
          r.positionCode || 0,
          r.playedMinutes || 0,
          r.rating || 0,
          r.hrfDate || ''
        )
      );
      await context.env.DB.batch(batch);
      inserted += chunk.length;
    }

    return new Response(JSON.stringify({ ok: true, inserted }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}
