# Sushi Jem Admin (لوحة التحكم)

The admin panel lives at **/admin** on the live site:
https://restaurant.sushijem.workers.dev/admin

It is excluded from search engines (noindex) and not linked anywhere on the public site.

## What it can edit

Everything on the site, published instantly on save:

- **Announcement bar** — the red bar at the very top of the site (on/off, Arabic + English text, optional link)
- **Offers** — cards shown in their own section (title, description, badge, price, old price, image, link, on/off, reorder)
- **Menu** — categories, groups, items, variants/prices (add, delete, reorder, featured flag, images, calories)
- **Texts** — every Arabic and English string on the site, grouped by section (nav, hero, services, branches, footer, cart flow, JOLT popup...)
- **Settings** — WhatsApp number, phones, HungerStation link, Instagram, Snapchat, map coordinates, marquee strip words, gallery photos, branches, JOLT popup on/off
- **Security** — change the admin password (min 8 chars)
- **Tools** — export/import the whole content as JSON, reset to the site defaults

## Developer panel (/dev)

A separate panel for the developer (Arabic/English toggle in the top bar):

- **Change limits** — daily/weekly save limits, with quick presets (default 2/7, relaxed 5/20, unlimited)
- **Bonus balance** — grant, set or zero extra changes drawn after the limits run out
- **Admin lock** — lock/unlock the admin entirely, or reset today's usage
- **Content history** — the last 20 published versions are kept automatically; preview any version's JSON and roll back to it (restores are free — they don't consume admin credits)
- **Admin account** — generate a fresh random admin password (all admin sessions are logged out) or force the admin out of all devices
- **Recent changes** — a live feed of saves and developer restores

## How it works

- The public site (`public/index.html`) keeps built-in defaults and loads the published content from the API at boot. If nothing was ever published (or the API is unreachable), the site works exactly as before, including offline from a folder.
- Published content is stored in Cloudflare D1 (`sushi-jem-content`), served by the Worker in `worker.js`.
- Login uses a session cookie (HttpOnly, Secure, SameSite=Lax). Five wrong passwords lock login for 15 minutes.
- Deploy: push to GitHub main. Cloudflare Workers Builds deploys the repo (`wrangler.toml`, assets in `public/`, worker in `worker.js`).

## Repo layout

```
worker.js          Cloudflare Worker: /api/* endpoints, /admin rewrite, static assets
wrangler.toml      Worker config (name "restaurant", assets ./public, D1 binding)
public/            Static site (index.html, admin.html, content.json, images/)
build-content.js   Regenerates public/content.json from index.html defaults
content.json       Default content (regenerate with: node build-content.js)
ADMIN-README.md    This file
```

If you ever edit the built-in defaults inside `public/index.html`, run `node build-content.js` so the admin's "defaults" match.

## Notes

- Images: enter a file name like `dish-1` (served as `images/dish-1.jpg`) or a full `https://` URL. Put new photo files in `public/images/` and commit them.
- The admin password is set directly in the D1 database (no public setup endpoint). Change it anytime from the Security section.
- The Worker creates any missing tables automatically on first request (`ensureSchema` in `worker.js`, idempotent). `migrations/0001-credits-tables.sql` mirrors the schema for reference or fresh environments.
- Credit failures are fail-closed: if the credits tables are unreachable, saves return a 503 `credits_unavailable` error and nothing is written (the admin UI shows a clear message instead of a generic network error).
