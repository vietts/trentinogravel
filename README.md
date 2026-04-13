# Trentino Gravel — Pioneer Edition

Single-page landing for the **Trentino Gravel — Pioneer Edition** event (Rovereto, 26 September 2026), organised by [Bike Adventure Series](https://www.bikeadventureseries.com) / Tuscany Trail.

Goal: collect emails for the waiting list before registration opens.

## Files

| File | Purpose |
|------|---------|
| `concept.html` | Live landing page (HTML + inline CSS + inline JS, mobile-first) |
| `index.html` | Copy of `concept.html` — used by Netlify/Cloudflare (no symlinks) |
| `privacy.html` | Privacy policy (placeholder copy, awaiting final text from client) |
| `extracted/` | Brand assets (logos SVG/PNG, favicon) |
| `archive/` | Old snapshot versions, kept for rollback |

## Local preview

```bash
cd trentinogravelweb
python3 -m http.server 8765
open http://localhost:8765/concept.html
```

## Edit mode (no-code content editing)

Open the page with `?edit=1` to activate the inline editor:

```
https://your-domain.com/concept.html?edit=1
```

- **Click any text** on the page → popup with IT and EN fields
- Edit and see changes live
- Press **Salva su GitHub ↑** to commit directly to the repo (Cloudflare/Netlify will deploy automatically)
- Press **Scarica** to download the file locally instead

### First-time GitHub setup (⚙ button)

| Field | Value |
|-------|-------|
| Owner / Repository | `vietts/trentinogravel` |
| Branch | `main` |
| Path | `concept.html` |
| Token | GitHub PAT with **Contents: Read & Write** on this repo |

Generate a token at: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained.

The token is stored only in your browser's `localStorage` and is never sent anywhere except the GitHub API.

> **Note:** After saving via GitHub, `index.html` will be out of sync. Run `cp concept.html index.html` and push, or use the Scarica button and replace both files manually.

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
2. Apri `http://localhost:8765/concept.html` nel browser
3. In un altro terminale avvia Claude: `claude`
4. Chiedi le modifiche — Claude le applica direttamente su `concept.html`
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

## Brevo setup required before going live

1. Create a contact list in Brevo and paste its numeric id into `BREVO_CONFIG.listId` inside `concept.html`
2. Create these custom contact attributes:
   - `EX_TUSCANY_TRAIL` — Boolean
   - `ROUTE_PREFERENCE` — Text (values: `long` / `short`)
   - `SOURCE` — Text
   - `SIGNUP_LANG` — Text
3. **Security**: move the POST call to a backend/edge-function proxy before publishing

## Roadmap

- [ ] Replace placeholder photos with the real Trentino photo shoot
- [ ] Swap partner logos (APT Trentino, Comune di Rovereto, bike brands)
- [ ] Wire `BREVO_CONFIG.listId` to the real list
- [ ] Move the Brevo POST behind a proxy (Cloudflare Worker / Supabase Edge Function)
- [ ] Publish final privacy policy copy in `privacy.html`
- [ ] OG image (`extracted/og-image.jpg`) for social previews (1200×630)
- [ ] Add real video to `.film-player` once the teaser is ready

## License

Private — © 2026 Bike Adventure Series
