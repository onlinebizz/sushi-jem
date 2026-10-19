# Inline editor (test project)

Instead of the form-based admin panel, the owner opens the live site with `?edit`
in the URL, signs in, and edits the page directly: click text to change it, click
an image to replace it, click a price to change the number. A floating toolbar
(bottom) shows the mode and saves everything back to the same content JSON in D1
that the site renders from.

## What is editable in this first version

- Menu: item names (both languages — the small label under the name edits the
  other language), descriptions, prices (per selected variant), variant names,
  category tab labels (double-click), group titles, calorie badges, number
  badges, kanji placeholders.
- All fixed text on the page (hero, sections, services, branches, footer…).
- Images: menu item photos, gallery rail photos, the three dish photos, the
  sign, the wall photo, the logo image.
- The footer phone number and the marquee words.

Not yet editable (still admin-panel work): adding/removing items or categories,
offers beyond what already exists, the WhatsApp/Instagram/Snapchat links, the
logo shape (SVG).

## How it works

- `public/edit.js` — the editor. Loaded only when the URL contains `?edit`
  (see the injection snippet at the bottom of `public/index.html`).
- Single click edits plain text and images. Buttons keep their normal action on
  a single click (tabs still switch, variants still select) — double-click a
  button to edit its label.
- Edits apply to the currently displayed language (Arabic or English).
- Editing is scoped to the value's text node, so surrounding markup (currency
  symbol, labels) is never destroyed. Escape cancels and restores the original.
- Text edits are stored escaped — typing literal `<b>markup</b>` stays literal.
- Save sends the whole content JSON to `PUT /api/content` — the same endpoint
  the admin panel uses. Nothing is saved until Save; Discard reloads.
- Image replacement uploads through the existing `POST /api/media` (stored in
  D1) and stores the returned `/media/...` URL in the content.

## Auth

- Reuses the admin password and session table.
- Login also returns a Bearer token (kept in memory by the editor) so editing
  works even where cookies are blocked (e.g. sandboxed previews). When an
  Authorization header is supplied it is the only accepted credential — an
  invalid token is rejected, never silently downgraded to cookies. Cookie
  sessions behave exactly as before (including the same-origin check on
  writes); `admin.html` is untouched.

## Try it locally

Requires Node 20+ and wrangler 4.x (`npm install wrangler@4`):

```bash
node seed/make-seed.js            # builds seed/seed.sql (default password: sushijem2026)
npx wrangler d1 execute DB --local --config wrangler.edit.toml --file seed/seed.sql
npx wrangler dev -c wrangler.edit.toml --port 8787
# open http://localhost:8787/?edit
```

## Isolation for testing

`wrangler.edit.toml` deploys a separate Worker (`restaurant-edit`) that shares
the D1 database but reads/writes only tables prefixed with `t_` (via the `TP`
var), so a test deployment never touches the live site's rows. Production
(`wrangler.toml`) has no `TP` var and uses the normal tables.

The table prefix is handled by `tables(env)` in `worker.js`.

## Known limits (this is a first test)

- Last-write-wins on save: two editors saving at once can overwrite each other.
- The toolbar floats over the bottom of the page (body gets extra padding in
  edit mode so content stays reachable).
