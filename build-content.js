#!/usr/bin/env node
/* Extracts all editable content from index.html into content.json (defaults).
   Run after editing index.html data: node build-content.js */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

// 1. Extract the main script block
const m = html.match(/<script>\n(\(function\(\)\{\n'use strict';[\s\S]*?\n\}\)\(\);\n)<\/script>/);
if (!m) { console.error('main script block not found'); process.exit(1); }
const script = m[1];

// 2. Cut the data portion: from 'var CONFIG' to '/* ---------- state ---------- */'
const start = script.indexOf('var CONFIG');
const end = script.indexOf('/* ---------- state ---------- */');
if (start < 0 || end < 0) { console.error('data section not found'); process.exit(1); }
const dataCode = script.slice(start, end);

// 3. Eval the data portion in this node context (it is plain ES5 data + pure helpers)
const vm = require('vm');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(dataCode + '\nthis.__out = {CONFIG:CONFIG, PIECES:PIECES, MENU:MENU, IMG:IMG, EN:EN, DYN:DYN, PH:PH};', sandbox);
const { CONFIG, PIECES, MENU, IMG, EN, DYN, PH } = sandbox.__out;

// 4. AR strings from data-i18n elements (all text-only containers)
const AR = {};
const re = /data-i18n="([^"]+)"[^>]*>([^<]*)</g;
let mm, seen = new Set();
while ((mm = re.exec(html))) {
  const key = mm[1], val = mm[2];
  if (!seen.has(key)) { AR[key] = val; seen.add(key); }
}

// 5. Hardcoded values from the HTML
const phoneIntl = (html.match(/tel:(\+?\d+)/) || [])[1] || '+966553694398';
const phone = (html.match(/#i-phone"\/><\/svg>\s*([\d]+)/) || [])[1] || '0553694398';
const instagram = (html.match(/instagram\.com\/([^/"')]+)/) || [])[1] ? 'https://www.instagram.com/' + html.match(/instagram\.com\/([^/"')]+)/)[1] + '/' : '';
const snapchat = (html.match(/https:\/\/www\.snapchat\.com\/(@[^"'<]+)/) || [])[0] || '';
const mapCoords = (html.match(/maps\?q=([\d.]+,[\d.]+)/) || [])[1] || '19.1089791,42.1296272';
const metaDescAr = (html.match(/<meta name="description" content="([^"]+)"/) || [])[1] || '';
const metaTitleAr = (html.match(/<title>([^<]+)<\/title>/) || [])[1] || '';

// 6. Marquee items (first half of the repeated sequence)
const marq = html.match(/<div class="marq"[^>]*><div[^>]*>([\s\S]*?)<\/div><\/div>/);
let marquee = [];
if (marq) {
  const items = [];
  const re2 = /<span>([^<]*)<\/span>/g; let m2;
  while ((m2 = re2.exec(marq[1]))) items.push(m2[1]);
  marquee = items.slice(0, Math.ceil(items.length / 2));
}

// 7. Assemble content.json
const content = {
  _comment: 'Sushi Jem site content defaults. Edited via /admin — stored overrides live in D1, not here.',
  meta: {
    title: [metaTitleAr, EN['meta.title'] || 'Sushi Jem | East Asian food in Al-Namas'],
    description: [metaDescAr, EN['meta.description'] || '']
  },
  config: {
    wa: CONFIG.wa,
    phone: phone,
    phoneIntl: phoneIntl,
    currency: CONFIG.currency,
    hungerStation: CONFIG.hungerStation,
    instagram: instagram,
    snapchat: snapchat,
    mapCoords: mapCoords,
    branches: CONFIG.branches,
    rail: CONFIG.rail,
    marquee: marquee
  },
  menu: MENU,
  img: IMG,
  strings: { ar: AR, en: EN },
  dyn: DYN,
  ph: PH,
  announcement: { enabled: false, text: ['', ''], link: '' },
  offers: [],
  jolt: { enabled: true }
};

fs.writeFileSync(path.join(__dirname, 'public', 'content.json'), JSON.stringify(content, null, 1));
console.log('content.json written.');
console.log('AR keys:', Object.keys(AR).length, '| EN keys:', Object.keys(EN).length, '| menu cats:', MENU.length, '| marquee:', marquee.join(' / '));
