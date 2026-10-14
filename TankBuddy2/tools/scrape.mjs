// Downloads today's prices of ALL DATS24 stations (via carbu.com station pages) into Firestore.
// Crawl: starts from known stations (min. Izegem 3743) and follows "nearby DATS24" links until nothing new.
// Usage: node scrape.mjs [--force]   (skips if last successful run < 6h ago, unless --force)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';
import { serviceAccount } from './key.mjs';
import { decode } from './decode.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const log = (...a) => { const line = `${new Date().toISOString()} ${a.join(' ')}`; console.log(line); try { fs.appendFileSync(path.join(here, 'scrape.log'), line + '\n'); } catch {} };
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const force = process.argv.includes('--force');
const BASE = 'https://carbu.com/belgie/index.php/station/dats24/';
const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Brussels' });

const meta = await db.doc('meta/scrape').get();
const last = meta.exists ? meta.data().lastOk?.toDate?.() : null;
if (!force && last && Date.now() - last.getTime() < 6 * 3600e3) { log('skip: last ok run', last.toISOString()); process.exit(0); }

const fuelKey = (t) => {
  t = t.replace(/&nbsp;/g, ' ').trim();
  if (/^Super 95 \(E10\)/.test(t)) return 'euro95';
  if (/^Super 95 \(E5\)/.test(t)) return 'euro95e5';
  if (/^Super 98 \(E5\)/.test(t)) return 'euro98';
  if (/^Super 98 \(E10\)/.test(t)) return 'euro98e10';
  if (/^Diesel \(B7\)/.test(t)) return 'diesel';
  if (/^Diesel \(B10\)/.test(t)) return 'dieselb10';
  if (/^Diesel\+/.test(t)) return 'dieselplus';
  if (/HVO|XTL/.test(t)) return 'hvo';
  if (/^LPG/.test(t)) return 'lpg';
  if (/^CNG/.test(t)) return 'cng';
  if (/^AdBlue/i.test(t)) return 'adblue';
  if (/^Hydro|^Waterstof/i.test(t)) return 'h2';
  return null;
};
const txt = (s) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

async function get(url) {
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (TankBuddy personal price tracker)', 'Accept-Language': 'nl-BE,nl;q=0.9' }, signal: AbortSignal.timeout(20000) });
      if (r.ok) return await r.text();
      if (r.status === 404) return null;
    } catch {}
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

function parse(html, id) {
  const name = txt((html.match(/itemprop="name"[^>]*>([^<]*)/) || [])[1] || '');
  const street = txt((html.match(/itemprop="street-address"[^>]*>([^<]*)/) || [])[1] || '');
  const zip = txt((html.match(/itemprop="locality"[^>]*>([^<]*)/) || [])[1] || '');
  const city = txt((html.match(/itemprop="street-address"[^>]*>[^<]*<\/span>\s*<br\/?>\s*[\s\S]{0,40}?itemprop="street-address"[^>]*>([^<]*)/) || [])[1] || '') ||
    txt((html.match(/<title>[^<]* te ([^<]*)/) || [])[1] || '');
  const lat = parseFloat((html.match(/Lat\s*=\s*(-?\d+\.\d+)/) || [])[1]);
  const lng = parseFloat((html.match(/Lng\s*=\s*(-?\d+\.\d+)/) || [])[1]);
  const p = {}; let srcDate = null;
  for (const m of html.matchAll(/<h2 class="title">([^<]*)<\/h2>[\s\S]*?class="price">([^<]*)<\/h1>\s*<p class="sources">([^<]*)/g)) {
    const k = fuelKey(m[1]); const v = parseFloat(txt(m[2]).replace(',', '.'));
    if (k && isFinite(v) && v > 0) { p[k] = v; srcDate ||= txt(m[3]); }
  }
  return { id, name: name || `DATS 24 ${city}`, address: [street.replace(/^(\d+[a-z]?),\s*(.*)$/i, '$2 $1'), [zip, city].filter(Boolean).join(' ')].filter(Boolean).join(', ').replace(/\s+,/g, ','), city,
    lat: isFinite(lat) ? lat : null, lng: isFinite(lng) ? lng : null, p, srcDate };
}

// ---- crawl
const known = await db.collection('stations').select('url').get();
const urls = new Map([['3743', BASE + 'izegem/8870/3743']]);
known.docs.forEach((d) => d.data().url && urls.set(d.id, d.data().url));
// seed list from discover.mjs (stations not yet in Firestore)
const seedFile = path.join(here, 'stations-seed.json');
if (fs.existsSync(seedFile)) for (const s of Object.values(JSON.parse(fs.readFileSync(seedFile, 'utf8')))) if (!urls.has(s.id)) urls.set(s.id, s.url);
const queue = [...urls.keys()], seen = new Set(); let ok = 0, fail = 0, batch = db.batch(), n = 0;
while (queue.length) {
  const id = queue.shift(); if (seen.has(id)) continue; seen.add(id);
  const html = await get(urls.get(id));
  if (!html) { fail++; log('fail', id); continue; }
  for (const m of html.matchAll(/station\/dats24\/([a-z0-9-]+)\/(\d+)\/(\d+)/g)) if (!urls.has(m[3])) { urls.set(m[3], BASE + `${m[1]}/${m[2]}/${m[3]}`); queue.push(m[3]); }
  const s = parse(html, id);
  if (!Object.keys(s.p).length) { fail++; log('no prices', id, s.name); continue; }
  const { p, srcDate, ...st } = s;
  batch.set(db.doc(`stations/${id}`), { ...st, brand: 'DATS24', url: urls.get(id), last: { day: today, p }, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  batch.set(db.doc(`stations/${id}/days/${today}`), { p, srcDate, src: 'carbu', ts: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  n += 2; ok++;
  if (n >= 400) { await batch.commit(); batch = db.batch(); n = 0; }
  await new Promise((r) => setTimeout(r, 350));
}
if (n) await batch.commit();
await db.doc('meta/scrape').set({ lastRun: admin.firestore.FieldValue.serverTimestamp(), ...(ok ? { lastOk: admin.firestore.FieldValue.serverTimestamp() } : {}), stationCount: ok, failed: fail, day: today, status: fail && !ok ? 'error' : 'ok' }, { merge: true });
log(`done: ${ok} stations ok, ${fail} failed, day ${today}`);

