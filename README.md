# Trentino Gravel — Pioneer Edition

Single-page landing for the **Trentino Gravel — Pioneer Edition** event (Rovereto, 26 September 2026), organised by [Bike Adventure Series](https://www.bikeadventureseries.com) / Tuscany Trail.

Goal: collect emails for the waiting list before registration opens.

## Files

| File | Purpose |
|------|---------|
| `concept.html` | Live landing page (HTML + inline CSS + inline JS, mobile-first) |
| `privacy.html` | Privacy policy template with placeholder copy |
| `index.html` | Symlink → `concept.html` |
| `extracted/` | Brand assets (logo SVG, BAS logo, favicon) |
| `concept-v[2-7]*.html` | Historical snapshots kept for rollback |

## Local preview

```bash
cd trentinogravelweb
python3 -m http.server 8765
open http://localhost:8765/concept.html
```

## Stack

- **HTML/CSS/JS**, zero build step
- **Fonts**: Bebas Neue · Barlow Condensed · DM Sans · DM Mono (Google Fonts)
- **Placeholder photos**: Unsplash (swap to local assets before launch)
- **i18n**: vanilla JS toggle IT/EN via `data-i18n-it` / `data-i18n-en`
- **Form**: Brevo REST API (`/v3/contacts`) — patterned on The Grand Escape implementation

## Brevo setup required before going live

1. Create a contact list in the Brevo dashboard and paste its numeric id into `BREVO_CONFIG.listId` inside `concept.html`.
2. Create these custom contact attributes:
   - `EX_TUSCANY_TRAIL` — Boolean
   - `ROUTE_PREFERENCE` — Text (values: `long` / `short`)
   - `SOURCE` — Text
   - `SIGNUP_LANG` — Text
3. **Security**: move the POST call to a backend/edge-function proxy before publishing; the current setup ships the API key to the client (same pattern as thegrandescape.cc, acceptable only for internal launch).

## Design system (tokens)

```css
--blue:       #3B50C8
--blue-deep:  #2B3DA0
--orange:     #E85520
--cream:      #F2EEAE
--offwhite:   #F5EDE0
--ink:        #0C0E1A
```

## Roadmap

- [ ] Replace Unsplash placeholders with the real Trentino photo shoot
- [ ] Swap Bike Adventure Series + partner logos (APT Trentino, Comune di Rovereto, bike brands)
- [ ] Wire `BREVO_CONFIG.listId` to the real list
- [ ] Move the Brevo POST behind a proxy (Cloudflare Worker / Supabase Edge Function)
- [ ] Publish final privacy policy copy in `privacy.html`
- [ ] OG image (`extracted/og-image.jpg`) for social previews
- [ ] Add real video to `.film-player` once the teaser is ready (section currently removed, CSS still available)

## License

Private — © 2026 Bike Adventure Series
