const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

// GET /api/reports — Load all match reports
export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare(
      'SELECT match_id, match_date, rapport, compte_rendu, notes_detaillees, saved_at FROM match_reports ORDER BY match_date DESC'
    ).all();

    const reports = {};
    for (const row of results) {
      reports[row.match_id] = {
        date: row.match_date,
        rapport: row.rapport || '',
        compteRendu: row.compte_rendu || '',
        notesDetaillees: row.notes_detaillees || '',
        savedAt: row.saved_at
      };
    }

    return new Response(JSON.stringify(reports), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}

// POST /api/reports — Save a match report (upsert)
export async function onRequestPost(context) {
  try {
    const { matchId, date, rapport, compteRendu, notesDetaillees } = await context.request.json();

    await context.env.DB.prepare(
      `INSERT INTO match_reports (match_id, match_date, rapport, compte_rendu, notes_detaillees, saved_at)
       VALUES (?, ?, ?, ?, ?, datetime("now"))
       ON CONFLICT(match_id) DO UPDATE SET
         match_date = excluded.match_date,
         rapport = excluded.rapport,
         compte_rendu = excluded.compte_rendu,
         notes_detaillees = excluded.notes_detaillees,
         saved_at = datetime("now")`
    ).bind(matchId, date || '', rapport || '', compteRendu || '', notesDetaillees || '').run();

    return new Response(JSON.stringify({ ok: true }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}
