# Trentino Gravel — Pioneer Edition

Single-page landing for the **Trentino Gravel — Pioneer Edition** event (Rovereto, 26 September 2026), organised by [Bike Adventure Series](https://www.bikeadventureseries.com) / Tuscany Trail.

Goal: collect emails for the waiting list before registration opens.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Live landing page (HTML + inline CSS + inline JS, mobile-first) |
| `privacy.html` | Privacy policy — body loaded at runtime from `content.privacy` |
| `content.json` | i18n strings (IT/EN), SEO meta, privacy body — edited via PageCMS |
| `.pages.yml` | PageCMS schema (`content.json` + `photos/` media) |
| `worker/` | Cloudflare Worker — Brevo proxy + Meta CAPI |
| `extracted/` | Brand assets (logos SVG/PNG, favicon) |
| `photos/` | Photo assets (committed, served by Cloudflare) |
| `archive/` | Old snapshot versions, kept for rollback |

## Local preview

```bash
cd trentinogravel
python3 -m http.server 8765
open http://localhost:8765/
```

## Modifica contenuti (PageCMS)

Tutti i testi bilingui (IT/EN) sono in `content.json`. Per modificarli:

1. Vai su **[pagecms.dev](https://pagecms.dev)** e accedi con GitHub
2. Apri il repository `vietts/trentinogravel`
3. Seleziona la collection **Contenuto Sito** → modifica qualsiasi testo
4. Salva → PageCMS committa su GitHub → Cloudflare/Netlify rideploya automaticamente

Le modifiche sono live in ~30 secondi. Nessun codice, nessun terminale.

> **Per testi hardcoded fuori da content.json** (schema.org, label form) usa Claude Code o modifica `index.html` direttamente.

## Usare Claude Code su questo progetto (macOS)

Claude Code è un assistente AI nella riga di comando che legge il codice e fa modifiche direttamente sui file.

### Installazione (una volta sola)

```bash
npm install -g @anthropic-ai/claude-code
```

> Richiede Node.js ≥ 18. Se non ce l'hai: `brew install node`

### Aprire il progetto

```bash
git clone https://github.com/vietts/trentinogravel.git
cd trentinogravel
claude
```

Si apre una sessione interattiva nel terminale. Da lì puoi scrivere in italiano quello che vuoi fare.

### Esempi di prompt utili per questo progetto

**Modifiche al design:**
```
cambia il colore del bottone CTA in #D46840
aumenta il padding della sezione hero su mobile
rendi il titolo della sezione FAQ più grande
```

**Modifiche ai testi (alternativa all'edit mode):**
```
nella sezione "Organized by" cambia il testo italiano in "..."
aggiungi una nuova FAQ: domanda "..." risposta "..."
```

**Modifiche funzionali:**
```
il form non mostra il messaggio di errore, controllalo
aggiungi il campo "città" al form della waitlist
```

**Deploy:**
```
fai il commit e pusha su GitHub
```

### Workflow consigliato

1. Avvia il server locale in un terminale: `python3 -m http.server 8765`
2. Apri `http://localhost:8765/` nel browser
3. In un altro terminale avvia Claude: `claude`
4. Chiedi le modifiche — Claude le applica direttamente su `index.html`
5. Ricarica il browser per vedere il risultato
6. Quando sei soddisfatto: `fai commit e push`

> **Per cambiare solo testi** usa l'[edit mode](#edit-mode-no-code-content-editing) direttamente nel browser — è più veloce e non richiede il terminale.

## Stack

- **HTML/CSS/JS**, zero build step
- **Fonts**: Bebas Neue · Barlow Condensed · DM Sans · DM Mono (Google Fonts)
- **Photos**: local assets in `photos/` (gitignored, served locally or via CDN)
- **i18n**: vanilla JS toggle IT/EN via `data-i18n-it` / `data-i18n-en` attributes
- **Form**: Brevo REST API (`/v3/contacts`)

## Design system (tokens)

```css
--blue:       #2C5E2E  /* forest green */
--blue-deep:  #1A3C1C
--blue-light: #3D7A40
--orange:     #C25832  /* terracotta */
--cream:      #F2EEAE
--offwhite:   #F5EDE0
--ink:        #0A150A
```

## Backend setup required before going live

The form POSTs to the Cloudflare Worker in `worker/`. It owns the Brevo API
key and the Meta CAPI token — nothing secret ships to the browser.

1. In Brevo, create a contact list for "Trentino Gravel — Pioneer" and note
   its numeric id.
2. In Brevo → Contacts → Attributes, create:
   - `EX_TUSCANY_TRAIL` (Boolean)
   - `ROUTE_PREFERENCE` (Text: `long` | `short`)
   - `SOURCE` (Text)
   - `SIGNUP_LANG` (Text)
3. Deploy the Worker and set secrets (see `worker/wrangler.toml`):
   ```bash
   cd worker && npm install
   npx wrangler secret put BREVO_API_KEY
   npx wrangler secret put BREVO_LIST_ID
   npx wrangler secret put META_PIXEL_ID
   npx wrangler secret put META_CAPI_ACCESS_TOKEN
   npx wrangler secret put TURNSTILE_SECRET_KEY
   npx wrangler deploy
   ```
4. Paste the deployed Worker URL into `WORKER_CONFIG.endpoint` inside
   `index.html` (e.g. `https://api.trentinogravel.it/waitlist`).

## Roadmap

- [ ] Replace placeholder photos with the real Trentino photo shoot
- [ ] Swap partner logos (APT Trentino, Comune di Rovereto, bike brands)
- [ ] Deploy the Worker in `worker/` and wire `WORKER_CONFIG.endpoint`
- [ ] Meta Pixel base code + consent banner (required before Pixel loads)
- [ ] Fill `privacy.bodyIt` / `privacy.bodyEn` in PageCMS with final legal text
- [ ] Upload OG image 1200×630 (set `seo.ogImage` in PageCMS)
- [ ] Add real video to `.film-player` once the teaser is ready

## License

Private — © 2026 Bike Adventure Series
