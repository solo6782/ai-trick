const CORS = {
  'Access-Control-Allow-Origin': 'https://ai-trick.pages.dev',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

export async function onRequestPost(context) {
  try {
    const { system, message, model, systemBlocks, messageBlocks } = await context.request.json();

    // La clé API vient UNIQUEMENT du secret serveur Cloudflare, jamais du navigateur.
    const apiKey = context.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Clé API non configurée côté serveur (secret ANTHROPIC_API_KEY manquant).' }), {
        status: 500, headers: CORS
      });
    }

    const selectedModel = model || 'claude-opus-4-6';

    // Build system: prefer structured cacheable blocks if provided, else plain string
    const systemPayload = Array.isArray(systemBlocks) && systemBlocks.length
      ? systemBlocks
      : system;

    // Build user content: prefer structured cacheable blocks if provided, else plain string
    const userContent = Array.isArray(messageBlocks) && messageBlocks.length
      ? messageBlocks
      : message;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: 16384,
        system: systemPayload,
        messages: [{ role: 'user', content: userContent }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.error?.message || JSON.stringify(data.error) || `API error ${response.status}`;
      return new Response(JSON.stringify({ error: errMsg }), {
        status: response.status, headers: CORS
      });
    }

    return new Response(JSON.stringify(data), { headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: CORS
    });
  }
}
