// Trentino Gravel — Worker for /api/waitlist (Brevo proxy)
// Env vars: BREVO_API_KEY, BREVO_LIST_ID, ALLOWED_ORIGIN (optional)

const MAX_FIELD_LEN = 200;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROUTES = new Set(['long', 'short']);
const VALID_LANGS = new Set(['it', 'en']);

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(env, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(env), 'Content-Type': 'application/json' },
  });
}

function str(v) {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

async function handleWaitlist(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(env) });
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(env, { error: 'Payload non valido' }, 400);
  }

  // Honeypot: if a bot fills the hidden "website" field, fake success.
  if (str(body.website).trim()) {
    return json(env, { ok: true, skipped: true });
  }

  const email = str(body.email).trim().toLowerCase();
  const name = str(body.name).trim();
  const route = str(body.route).trim();
  const exTT = body.exTT === true || body.exTT === 'yes';
  const lang = str(body.lang).trim().toLowerCase() || 'it';

  if (!EMAIL_RE.test(email) || email.length > MAX_FIELD_LEN) {
    return json(env, { error: 'Email non valida' }, 400);
  }
  if (name && name.length > MAX_FIELD_LEN) {
    return json(env, { error: 'Nome troppo lungo' }, 400);
  }
  if (route && !VALID_ROUTES.has(route)) {
    return json(env, { error: 'Percorso non valido' }, 400);
  }
  if (!VALID_LANGS.has(lang)) {
    return json(env, { error: 'Lingua non valida' }, 400);
  }

  const apiKey = env.BREVO_API_KEY;
  const listId = parseInt(env.BREVO_LIST_ID, 10);
  if (!apiKey || !listId) {
    return json(env, { error: 'Configurazione server mancante' }, 500);
  }

  const payload = {
    email,
    attributes: {
      ...(name ? { FIRSTNAME: name } : {}),
      EX_TUSCANY_TRAIL: exTT,
      ...(route ? { ROUTE_PREFERENCE: route } : {}),
      SOURCE: 'trentino_gravel_pioneer_2026',
      SIGNUP_LANG: lang,
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
      console.error('brevo_failed', res.status, err);
      return json(env, { error: 'Servizio temporaneamente non disponibile' }, 502);
    }
  }

  return json(env, { ok: true });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/waitlist') return handleWaitlist(request, env);
    return env.ASSETS.fetch(request);
  },
};
