const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

// GET /api/predictions — Load all predictions + classifications
export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare(
      'SELECT player_id, predictions, potential_score, updated_at FROM ai_predictions'
    ).all();

    const preds = {};
    for (const row of results) {
      const data = JSON.parse(row.predictions);
      preds[row.player_id] = {
        skills: data.skills || data, // backward compat: old format had skills directly
        category: data.category || null,
        justification: data.justification || null,
        naturalPosition: data.naturalPosition || null,
        missingSkills: data.missingSkills || [],
        potentialScore: row.potential_score,
        updatedAt: row.updated_at
      };
    }

    return new Response(JSON.stringify(preds), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}

// POST /api/predictions — Save predictions + classifications
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
      stmt.bind(p.id, JSON.stringify({
        skills: p.skills || {},
        category: p.category || null,
        justification: p.justification || null,
        naturalPosition: p.naturalPosition || null,
        missingSkills: p.missingSkills || []
      }), p.potentialScore || 0)
    );

    await context.env.DB.batch(batch);

    return new Response(JSON.stringify({ ok: true }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}
