# Sushi Jem Website: Design and Build Rules for Any AI Agent

Follow every rule below when building or editing this site, or any sibling site in the same style. Each rule exists because the result looked spectacular and worked flawlessly.

## 1. Project and context
- Client: Sushi Jem (سوشي جيم), a women-owned East Asian and sushi restaurant in Al-Namas, Asir, Saudi Arabia.
- Deliverable: a single-file static site (`index.html` plus an `images/` folder) that is sold to the owner. It must look premium, load fast and work offline from a folder.
- Facts to keep consistent: phone 0553694398 (WhatsApp 966553694398), coordinates 19.1089791, 42.1296272, main branch on Main Street opposite Dunkin', second branch at ممشى الضباب, Snapchat @sushijem, Instagram sushi.jem (unconfirmed), menu link https://me-qr.com/hPIcZMq8, tagline "a sushi experience combining art, quality, and distinctive flavors".
- Never invent dishes, prices, hours, reviews or ratings. Leave clearly marked fillable slots instead.

## 2. Copy rules (non-negotiable)
- No em dashes (U+2014) and no en dashes (U+2013) anywhere, including code comments that ship.
- No litotes (no "not bad", "not uncommon", "لا بأس به" style understatements by double negation). State things directly and positively.
- Arabic is the primary language. Write real marketing Arabic: confident, warm, sensory, short sentences, punchy headlines. Do not translate English word for word.
- Signature voice: playful and bold (example band: "تحذير: قد تتحول من مجرّب إلى عميل دائم").
- Every Arabic string has an English twin for the EN toggle.
- Run a script check for the dash characters and litotes before delivering.

## 3. Brand and visual identity
- The logo and the whole palette come from the real shop sign: a glowing gold, bubbly brush "SUSHI JEM" with "寿司吉姆" below it, on a dark night wall.
- The logo is a traced vector (`images/logo.svg`, viewBox 487.2 x 253.0) with a gold gradient. It must match the real sign. Never retype it in a font.
- Theme: warm-black night with glowing gold. Light themes are rejected.
- Color tokens (define on `:root`, never hardcode elsewhere):
  - `--night:#0C0905` page background
  - `--night-2:#140F09` alternate sections
  - `--panel:#1B140C` and `--panel-2:#241A0F` cards
  - `--line:rgba(255,216,102,.2)` borders
  - `--gold:#FFD866` primary accent
  - `--gold-hi:#FFF1B8` highlights
  - `--amber:#F2A91F` glow and gradients
  - `--cream:#F7ECD3` body text
  - `--muted:#BBAB8C` secondary text
  - `--ink:#1A1206` text on gold surfaces
- Gold is the only accent. Food illustrations may use warm food colors through `--f1/--f2/--f3/--sauce`.
- Glow, not flat color: the logo uses `drop-shadow(0 0 5px rgba(255,205,90,.85)) drop-shadow(0 0 28px rgba(255,160,30,.5))`. Big gold numerals use a soft `text-shadow`.
- Shape language: "leaf" corners via `--leaf:36px 6px 36px 6px` on cards, panels and photos. Do not use uniform rounded rectangles.
- The sign photo is cropped with a roof-shaped `clip-path`, echoing the building.

## 4. Typography
- Load from Google Fonts with `display=swap`: `IBM Plex Sans Arabic` (400, 500, 600), `Lalezar`, `Ma Shan Zheng`, `Mochiy Pop One`.
- `--f-display: Lalezar` for every heading (h1, h2, h3, big numerals). It is chunky and friendly and matches the bubbly sign. Keep `font-weight:400` on headings, since Lalezar has one weight.
- `--f-body: IBM Plex Sans Arabic` for body text, size 1.0625rem, line-height 1.85 (Arabic needs generous leading).
- `--f-han: Ma Shan Zheng` for the 寿司吉姆 characters only.
- When `html[lang="en"]`, display switches to `Mochiy Pop One` so English headings stay bubbly like the sign.
- All headings use `clamp()` so they scale fluidly, for example the hero h1 `clamp(2rem,4.8vw,3.9rem)` and section h2 `clamp(2rem,5vw,3.6rem)`. Keep headline `max-width` in `em` so lines break gracefully (hero `max-width:15em` or similar). Check that the hero headline never wraps to four lines on desktop.

## 5. Layout and spacing system
- Container: `.wrap{width:min(1180px,100% - 2*clamp(18px,4vw,40px));margin-inline:auto}`.
- Section rhythm: `padding:clamp(72px,10vw,140px) 0`. Generous whitespace is part of the luxury feel.
- Grids collapse with breakpoints at 1000px, 900px, 760px and 560px. Two-column blocks become one column. Mobile gutter is 16 to 18px minimum.
- Use logical properties (`margin-inline`, `padding-inline`, `inset-inline`) so RTL and LTR both work.
- Zero horizontal overflow at any width. Test it.

## 6. Page structure (in this order)
1. Sticky blurred nav: logo, section links, EN/AR toggle, order button.
2. Hero: big glowing logo, bold Arabic headline, two buttons (order on WhatsApp, view menu), subtle drifting fog.
3. Warning band: one playful line.
4. Services: five service cards (dine-in, takeaway, delivery, no-contact delivery, drive-through) and an amenities panel (women-owned badge, atmosphere chips: casual, cosy, quiet, trendy, plus payments, kids, parking). All from the Google Business listing.
5. Why us: bento grid of tiles.
6. Dishes: alternating two-column showcase with a photo in a circle and an SVG illustration fallback.
7. Menu: link-out button to the owner-approved menu plus a fillable priced list and photo slots.
8. Our place: sign photo (roof clip-path) and the stone-wall 寿司吉姆 photo.
9. Fog Walk: atmospheric full-width section for the second branch.
10. Gallery: hidden until at least 3 photos exist.
11. Jolt: playful interactive/illustrated call to action.
12. Branches: cards plus a dark-filtered Google Maps iframe.
13. Order steps: three numbered steps with huge gold numerals.
14. Review block.
15. Final CTA: solid gold background, ink text, huge headline.
16. Footer, plus a fixed mobile order bar.

## 7. Motion rules
- Hero logo "sign-on" flicker at load (`@keyframes signon`, about 2.6s, `steps(1,end)`), imitating a neon sign switching on.
- Slow fog drift (`@keyframes sway`, `translateX(-5vw)` to `5vw`).
- Subtle, purposeful motion only. Never bounce, spin or distract.
- Always honor `@media (prefers-reduced-motion:reduce)` by disabling animations.

## 8. Bilingual and RTL engine
- `<html lang="ar" dir="rtl">` by default.
- Every translatable node has `data-i18n="key"`. The AR dictionary is built from the DOM text at load. The EN dictionary lives in JS.
- The toggle switches `dir`, `lang`, `document.title` and the meta description, and saves the choice in `localStorage` inside try/catch (storage can throw).
- Verify that every `data-i18n` key exists in the EN dictionary.

## 9. Conversion and CONFIG
- One `CONFIG` object at the top of the script drives behavior: WhatsApp number, `orderUrl` override, map link, hours, `menuUrl`, `currency` and a `menu` array rendered into the priced list.
- WhatsApp deep links: `https://wa.me/966553694398?text=...` with a pre-filled Arabic message.
- A fixed order bar on mobile keeps the main action one tap away.
- Hours, prices and reviews appear only when CONFIG has real values.

## 10. Images and assets
- All images enhanced before use: Lanczos upscale, gentle `fastNlMeansDenoise`, CLAHE on the L channel in LAB, light unsharp mask. Use gentle settings. Harsh settings made stone texture noisy and were redone.
- Slots: `images/dish-1..3.jpg`, `images/gallery-1..6.jpg`, `images/menu-1..4.jpg`, `sign.jpg`, `wall.jpg`, `logo.svg`.
- Robustness: slots auto-detect with `new Image()` onload/onerror. Photos overlay illustrations with `<img class="photo" onerror="this.remove()">` so a missing file never shows a broken icon.
- Use only photos the owner approved (their own product shots). Never fabricate images.
- Icons, maki, nigiri, gyoza and the logo live in one inline SVG `<symbol>` sprite, referenced by `<use>`.
- Favicon points to `images/logo.svg`. `og:image` points to `images/sign.jpg`.

## 11. Technical rules
- Single self-contained HTML file with inline CSS and JS. Only external requests: Google Fonts and the Maps iframe.
- Semantic HTML, `alt` text on photos, `aria-hidden` on decorative SVG, visible focus states, sufficient contrast (cream and gold on near-black).
- No frameworks, no build tools, no localStorage dependence for rendering.
- Everything must still render correctly if storage, fonts or images fail.

## 12. Verification checklist (run before every delivery)
1. Em dash and en dash scan returns none. Litotes scan passes.
2. HTML tag balance, valid anchors, every `<use href="#id">` has a matching symbol.
3. i18n: every key in the EN dictionary.
4. Playwright headless Chromium, desktop (about 1440 wide) and mobile (about 390 wide): zero horizontal overflow, zero JS console errors, EN toggle flips `dir` and text.
5. Screenshot every section and look at them. Check hero wrapping, logo glow, card overlaps and image stretching.
6. Package a zip with `index.html` and `images/` and a README listing what the owner must supply (menu content, hours, reviews, Instagram confirmation).

## 13. Mistakes already made (do not repeat)
- Do not apply `svg{width:...}` rules globally. A broad rule stretched the WhatsApp icon. Scope selectors (for example `.jolt .lane`).
- Do not let decorative icons overlap text on mobile. Hide `.deco2` there and shrink `.deco`.
- Do not let menu photos stretch to full width. Use `repeat(auto-fit,minmax(240px,340px))` with `justify-content:start`.
- Do not over-sharpen photos.
- Do not edit read-only delivered files in place. Replace them or write a new path.

## 14. Process rules for agents
- Gather all material (logo, photos, facts) before building. Build in stages: outline, sections, then polish.
- Be efficient with budget: build the site first, then add extras.
- Say plainly what the client must still provide. Never pretend unknown facts are known.
