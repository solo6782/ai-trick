const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

// GET /api/settings — Load all settings
export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare(
      'SELECT key, value FROM settings'
    ).all();

    const settings = {};
    for (const row of results) {
      settings[row.key] = row.value;
    }

    return new Response(JSON.stringify(settings), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}

// POST /api/settings — Save a setting (upsert)
export async function onRequestPost(context) {
  try {
    const { key, value } = await context.request.json();

    await context.env.DB.prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).bind(key, value).run();

    return new Response(JSON.stringify({ ok: true }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}
