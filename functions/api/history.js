const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

// GET /api/history — Load match history, optionally by player
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const playerId = url.searchParams.get('player_id');

    let results;
    if (playerId) {
      results = (await context.env.DB.prepare(
        'SELECT * FROM player_match_history WHERE player_id = ? ORDER BY match_date DESC'
      ).bind(playerId).all()).results;
    } else {
      results = (await context.env.DB.prepare(
        'SELECT * FROM player_match_history ORDER BY match_date DESC'
      ).all()).results;
    }

    return new Response(JSON.stringify(results), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}

// POST /api/history — Batch upsert match history entries
export async function onRequestPost(context) {
  try {
    const { entries } = await context.request.json();

    if (!entries || entries.length === 0) {
      return new Response(JSON.stringify({ ok: true, inserted: 0 }), { headers: CORS });
    }

    const stmt = context.env.DB.prepare(
      `INSERT INTO player_match_history (player_id, match_id, match_date, position_code, played_minutes, rating, player_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(player_id, match_id) DO UPDATE SET
         match_date = excluded.match_date,
         position_code = excluded.position_code,
         played_minutes = excluded.played_minutes,
         rating = excluded.rating,
         player_name = excluded.player_name`
    );

    const BATCH_SIZE = 100;
    let total = 0;
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const chunk = entries.slice(i, i + BATCH_SIZE);
      const batch = chunk.map(e =>
        stmt.bind(e.playerId, e.matchId, e.matchDate || '', e.positionCode || 0, e.playedMinutes || 0, e.rating || 0, e.playerName || '')
      );
      await context.env.DB.batch(batch);
      total += chunk.length;
    }

    return new Response(JSON.stringify({ ok: true, inserted: total }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}
