# Inline editor (test project)

Instead of the form-based admin panel, the owner opens the live site with `?edit`
in the URL, signs in, and edits the page directly: click any text to change it,
click any image to replace it, click any price to change the number. A floating
toolbar (bottom) shows the mode and saves everything back to the same content JSON
in D1 that the site renders from.

## How it works

- `public/edit.js` — the editor. Loaded only when the URL contains `?edit`
  (see the injection snippet at the bottom of `public/index.html`).
- Single click edits plain text and images. Buttons keep their normal action on a
  single click (tabs still switch, variants still select) — double-click a button
  to edit its label.
- Edits apply to the currently displayed language (Arabic or English). The small
  label in the other language (e.g. the English name under an Arabic dish name)
  is also clickable and edits that language.
- Save sends the whole content JSON to `PUT /api/content` — the same endpoint
  the admin panel uses. Nothing is saved until Save is pressed; Discard reloads.
- Image replacement uploads through the existing `POST /api/media` (stored in D1)
  and stores the returned `/media/...` URL in the content.

## Auth

- Reuses the admin password and session table.
- Login also returns a Bearer token (kept in memory by the editor) so editing
  works even where cookies are blocked (e.g. sandboxed previews). Cookie-based
  sessions still work exactly as before; `admin.html` is untouched.

## Isolation for testing

`wrangler.edit.toml` deploys a separate Worker (`restaurant-edit`) that shares the
D1 database but reads/writes only tables prefixed with `t_` (via the `TP` var),
so a test deployment never touches the live site's rows. Production
(`wrangler.toml`) has no `TP` var and uses the normal tables.

The table prefix is handled by `tables(env)` in `worker.js`.

## Try it locally

```bash
npx wrangler d1 execute DB --local --config wrangler.edit.toml --file seed.sql
npx wrangler dev -c wrangler.edit.toml --port 8787
# open http://localhost:8787/?edit
```

## Known limits (this is a first test)

- Last-write-wins on save: two editors saving at once can overwrite each other.
- The site logo/dishes/sign photos are replaceable via the new `photos` map;
  the header logo SVG shape itself is not editable.
- Adding/removing menu items, categories and offers is still admin-panel work.
