# Cukrové nebe – web

One-page website for the Cukrové nebe cukrárna (Orlí 491/16, Brno) with online booking, legal pages and cookie consent.

## What gets published

Self-contained HTML files in the repository root (images, styles and scripts inlined):

| File | Page |
|---|---|
| `index.html` | the website |
| `ochrana-osobnich-udaju.html` | Zásady ochrany osobních údajů |
| `zasady-cookies.html` | Zásady používání cookies |
| `identifikacni-udaje.html` | Identifikační údaje provozovatele |

Upload all four together; they link to each other.

## Source

| Path | What it is |
|---|---|
| `src/template.html` | the main page |
| `src/pages/*.html` | the legal pages |
| `src/partials/` | shared pieces: design tokens, theme, cookie consent (`consent.js/.css/.html`), legal page layout, footer links |
| `src/site.json` | operator details, privacy settings, booking endpoint – **one place for all data the pages share** |
| `src/img/` | photos (WebP) |
| `build.py` | builds the HTML files from `src/` and lists data that is still missing |
| `tests/consent-e2e.js` | browser tests for cookie consent and the legal pages |
| `LEGAL-TODO.md` | what the operator must fill in or confirm before going live |

## Editing

1. Change files in `src/` (operator data only in `src/site.json`).
2. Run `python3 build.py`.
3. Commit the source and the rebuilt HTML files.

## Cookie consent

`src/partials/consent.js` blocks every optional script until the visitor agrees. Add analytics or marketing only like this:

```html
<script type="text/plain" data-consent="analytics" data-cookies="_ga,_ga_*" src="https://…"></script>
```

then describe the tool in `src/pages/zasady-cookies.html` and raise `CONSENT_VERSION` in `consent.js` so everyone is asked again. Details in `LEGAL-TODO.md`.

## Before going live

* Fill in everything listed in `LEGAL-TODO.md` (`build.py` prints what is missing).
* In the `CONFIG` block of `src/template.html`: real opening `hours`, then `demo: false`; service prices.

## Testing

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```
```bash
node tests/consent-e2e.js
```

## Hosting

GitHub Pages can serve the root folder: repository Settings → Pages → Deploy from a branch → `main` / root.
