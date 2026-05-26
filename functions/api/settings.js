const CORS = {
  'Access-Control-Allow-Origin': 'https://ai-trick.pages.dev',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Clés sensibles qui ne doivent JAMAIS transiter par l'API/navigateur.
// La clé API Anthropic est désormais un secret serveur (env.ANTHROPIC_API_KEY).
const BLOCKED_KEYS = new Set(['api_key']);

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

// GET /api/settings — renvoie les réglages NON sensibles uniquement
export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare(
      'SELECT key, value FROM settings'
    ).all();

    const settings = {};
    for (const row of results) {
      if (BLOCKED_KEYS.has(row.key)) continue; // ne jamais exposer les secrets
      settings[row.key] = row.value;
    }

    return new Response(JSON.stringify(settings), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}

// POST /api/settings — upsert d'un réglage NON sensible
export async function onRequestPost(context) {
  try {
    const { key, value } = await context.request.json();

    if (BLOCKED_KEYS.has(key)) {
      return new Response(JSON.stringify({ error: 'Cette clé ne peut pas être stockée via l\'API.' }), {
        status: 403, headers: CORS
      });
    }

    await context.env.DB.prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).bind(key, value).run();

    return new Response(JSON.stringify({ ok: true }), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}
