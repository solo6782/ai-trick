const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

// GET /api/predictions — Load all predictions
export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare(
      'SELECT player_id, predictions, potential_score, updated_at FROM ai_predictions'
    ).all();

    const preds = {};
    for (const row of results) {
      preds[row.player_id] = {
        skills: JSON.parse(row.predictions),
        potentialScore: row.potential_score,
        updatedAt: row.updated_at
      };
    }

    return new Response(JSON.stringify(preds), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}

// POST /api/predictions — Save predictions for multiple players
export async function onRequestPost(context) {
  try {
    const { players } = await context.request.json();

    const stmt = context.env.DB.prepare(
      `INSERT INTO ai_predictions (player_id, predictions, potential_score, updated_at)
       VALUES (?, ?, ?, datetime("now"))
       ON CONFLICT(player_id) DO UPDATE SET
         predictions = excluded.predictions,
         potential_score = excluded.potential_score,
         updated_at = datetime("now")`
    );

    const batch = players.map(p =>
      stmt.bind(p.id, JSON.stringify(p.skills), p.potentialScore)
    );

    await context.env.DB.batch(batch);

    return new Response(JSON.stringify({ ok: true }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}
