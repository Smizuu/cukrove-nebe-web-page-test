# Cukrové nebe – web

One-page website for the Cukrové nebe cukrárna (Orlí 491/16, Brno) with online booking.

- **`index.html`** – the finished site. One self-contained file (images included), ready to open or upload.
- **`src/template.html`** – the editable source, with `{{name}}` placeholders for images.
- **`src/img/`** – the photos, as WebP.
- **`build.py`** – rebuilds `index.html` from the template and images.

## Editing

1. Change `src/template.html` (or swap a photo in `src/img/`, keeping its file name).
2. Run `python3 build.py`.
3. Commit both the source and the rebuilt `index.html`.

## Before going live

Everything that needs real data is in the `CONFIG` block near the top of the script in `src/template.html`:

- `hours` – opening hours (currently example values); then set `demo: false`.
- `services[].price` – prices (empty shows "Cena doplníme").
- `bookingEndpoint` – where bookings are sent (e.g. a Formspree URL). Empty means the booking text is copied and Instagram Direct opens.
- `operator`, `privacy`, `terms` – details for the legal pages (empty shows "doplní provozovatel").

## Hosting

GitHub Pages can serve `index.html` directly: repository Settings → Pages → Deploy from a branch → `main` / root.
