const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

// GET /api/hrf — Load latest HRF data
export async function onRequestGet(context) {
  try {
    const row = await context.env.DB.prepare(
      'SELECT data, imported_at FROM hrf_data ORDER BY id DESC LIMIT 1'
    ).first();

    if (!row) {
      return new Response(JSON.stringify(null), { headers: CORS });
    }

    return new Response(JSON.stringify({
      ...JSON.parse(row.data),
      importedAt: row.imported_at
    }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}

// POST /api/hrf — Save parsed HRF data
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const data = JSON.stringify(body);

    await context.env.DB.prepare(
      'INSERT INTO hrf_data (data, imported_at) VALUES (?, datetime("now"))'
    ).bind(data).run();

    return new Response(JSON.stringify({ ok: true }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}
