const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

async function handleWaitlist(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Payload non valido' }, 400);
  }

  const { email, name, route, exTT, lang } = body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Email non valida' }, 400);
  }

  const apiKey = env.BREVO_API_KEY;
  const listId = parseInt(env.BREVO_LIST_ID, 10);
  if (!apiKey || !listId) {
    return json({ error: 'Configurazione server mancante' }, 500);
  }

  const payload = {
    email,
    attributes: {
      ...(name ? { FIRSTNAME: name } : {}),
      EX_TUSCANY_TRAIL: exTT === 'yes',
      ...(route ? { ROUTE_PREFERENCE: route } : {}),
      SOURCE: 'trentino_gravel_pioneer_2026',
      SIGNUP_LANG: lang || 'it',
      LINGUA: lang === 'en' ? 2 : 1, // 1=Ita, 2=Eng (categoria Brevo esistente)
    },
    listIds: [listId],
    updateEnabled: true,
  };

  const res = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify(payload),
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    if (err.code !== 'duplicate_parameter') {
      return json({ error: err.message || `Errore Brevo ${res.status}` }, 500);
    }
  }

  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/waitlist') return handleWaitlist(request, env);
    return env.ASSETS.fetch(request);
  },
};
