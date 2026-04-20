// Trentino Gravel — API Worker
// Handles waitlist signup: validates input, verifies Turnstile, creates the
// contact in Brevo, fires a Meta CAPI `Lead` event, and returns the event_id
// so the browser Pixel can fire a deduped client-side event.

const MAX_FIELD_LEN = 200;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return cors(env, new Response(null, { status: 204 }));

    if (request.method === "POST" && url.pathname === "/waitlist") {
      return cors(env, await handleWaitlist(request, env, ctx));
    }

    return cors(env, json({ error: "not_found" }, 404));
  },
};

async function handleWaitlist(request, env, ctx) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const email = str(body.email).trim().toLowerCase();
  const name = str(body.name).trim();
  const route = str(body.route).trim();
  const exTT = body.ex_tuscany_trail === true || body.ex_tuscany_trail === "yes";
  const lang = str(body.lang).trim().toLowerCase() || "it";
  const turnstileToken = str(body.turnstile_token);
  const fbp = str(body.fbp);
  const fbc = str(body.fbc);
  const honeypot = str(body.website);

  // Honeypot: if filled, pretend success without doing anything.
  if (honeypot) return json({ ok: true, event_id: crypto.randomUUID(), skipped: true });

  if (!EMAIL_RE.test(email) || email.length > MAX_FIELD_LEN) return json({ error: "invalid_email" }, 400);
  if (!name || name.length > MAX_FIELD_LEN) return json({ error: "invalid_name" }, 400);
  if (route !== "long" && route !== "short") return json({ error: "invalid_route" }, 400);
  if (lang !== "it" && lang !== "en") return json({ error: "invalid_lang" }, 400);

  const clientIp = request.headers.get("cf-connecting-ip") || "";
  const userAgent = request.headers.get("user-agent") || "";

  if (env.TURNSTILE_SECRET_KEY) {
    const ok = await verifyTurnstile(turnstileToken, clientIp, env.TURNSTILE_SECRET_KEY);
    if (!ok) return json({ error: "turnstile_failed" }, 403);
  }

  const eventId = crypto.randomUUID();

  const brevoRes = await createBrevoContact({ email, name, route, exTT, lang, env });
  if (!brevoRes.ok) return json({ error: "brevo_failed", detail: brevoRes.detail }, 502);

  // Fire CAPI in the background so the browser doesn't wait on Meta.
  ctx.waitUntil(
    sendCapiLead({
      env,
      eventId,
      email,
      name,
      route,
      exTT,
      lang,
      clientIp,
      userAgent,
      fbp,
      fbc,
      eventSourceUrl: request.headers.get("referer") || `https://trentinogravel.it/?lang=${lang}`,
    }).catch((err) => console.error("capi_error", err)),
  );

  return json({ ok: true, event_id: eventId });
}

async function createBrevoContact({ email, name, route, exTT, lang, env }) {
  const payload = {
    email,
    attributes: {
      FIRSTNAME: name,
      EX_TUSCANY_TRAIL: exTT,
      ROUTE_PREFERENCE: route,
      SOURCE: env.BREVO_SOURCE_TAG,
      SIGNUP_LANG: lang,
    },
    listIds: env.BREVO_LIST_ID ? [Number(env.BREVO_LIST_ID)] : undefined,
    updateEnabled: true,
  };

  const res = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "api-key": env.BREVO_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (res.ok || res.status === 204) return { ok: true };

  const detail = await res.json().catch(() => ({}));
  // "duplicate_parameter" = contact already exists → treat as success.
  if (detail.code === "duplicate_parameter") return { ok: true };
  return { ok: false, detail };
}

async function sendCapiLead({ env, eventId, email, name, route, exTT, lang, clientIp, userAgent, fbp, fbc, eventSourceUrl }) {
  if (!env.META_PIXEL_ID || !env.META_CAPI_ACCESS_TOKEN) return;

  const [emHash, fnHash, countryHash] = await Promise.all([
    sha256(email),
    sha256(name),
    sha256("it"),
  ]);

  const event = {
    event_name: "Lead",
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url: eventSourceUrl,
    user_data: {
      em: [emHash],
      fn: [fnHash],
      country: [countryHash],
      client_ip_address: clientIp || undefined,
      client_user_agent: userAgent || undefined,
      fbp: fbp || undefined,
      fbc: fbc || undefined,
    },
    custom_data: {
      route_preference: route,
      ex_tuscany_trail: exTT,
      language: lang,
      lead_source: env.BREVO_SOURCE_TAG,
    },
  };

  const payload = { data: [event] };
  if (env.META_TEST_EVENT_CODE) payload.test_event_code = env.META_TEST_EVENT_CODE;

  const url = `https://graph.facebook.com/${env.META_API_VERSION}/${env.META_PIXEL_ID}/events?access_token=${env.META_CAPI_ACCESS_TOKEN}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`capi_${res.status}_${text.slice(0, 200)}`);
  }
}

async function verifyTurnstile(token, ip, secret) {
  if (!token) return false;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ secret, response: token, remoteip: ip || undefined }),
  });
  const data = await res.json().catch(() => ({}));
  return data.success === true;
}

async function sha256(input) {
  const normalized = String(input || "").trim().toLowerCase();
  if (!normalized) return "";
  const buf = new TextEncoder().encode(normalized);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function str(v) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function cors(env, res) {
  const headers = new Headers(res.headers);
  headers.set("access-control-allow-origin", env.ALLOWED_ORIGIN || "*");
  headers.set("access-control-allow-methods", "POST, OPTIONS");
  headers.set("access-control-allow-headers", "content-type");
  headers.set("access-control-max-age", "86400");
  headers.set("vary", "origin");
  return new Response(res.body, { status: res.status, headers });
}
