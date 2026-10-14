// One-off/occasional: finds DATS24 stations by scanning carbu "focus" location codes. Merges into stations-seed.json.
// Usage: node discover.mjs <fromCode> <toCode>      e.g. node discover.mjs 2400 2700
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode } from './decode.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const seedFile = path.join(here, 'stations-seed.json');
const seed = fs.existsSync(seedFile) ? JSON.parse(fs.readFileSync(seedFile, 'utf8')) : {};
const [from, to] = [parseInt(process.argv[2]), parseInt(process.argv[3])];
const re = /data-lat="([^"]*)"\s+data-lng="([^"]*)"\s+data-id="(\d+)"\s+data-logo="dats24[^"]*"\s+data-name="([^"]*)"[^>]*?data-link="([^"]*)"\s+data-address="([^"]*)"/g;
let hits = 0, before = Object.keys(seed).length;

async function scan(code) {
  try {
    const r = await fetch(`https://carbu.com/belgie//liste-stations-service/E10/X/0/BE_foc_${code}/76`, { headers: { 'User-Agent': 'Mozilla/5.0 (TankBuddy personal price tracker)' }, signal: AbortSignal.timeout(25000) });
    if (!r.ok) return;
    const html = await r.text(); let found = 0;
    for (const m of html.matchAll(re)) {
      found++;
      seed[m[3]] ||= { id: m[3], name: decode(m[4]), url: m[5], lat: parseFloat(m[1]), lng: parseFloat(m[2]), address: decode(m[6].replace(/<br\/?>/g, ', ')) };
    }
    if (found) { hits++; console.log(`code ${code}: ${found} dats24 (total ${Object.keys(seed).length})`); }
  } catch {}
}

const codes = []; for (let c = from; c <= to; c++) codes.push(c);
const workers = Array.from({ length: 4 }, async () => { while (codes.length) { await scan(codes.shift()); await new Promise((r) => setTimeout(r, 250)); } });
await Promise.all(workers);
fs.writeFileSync(seedFile, JSON.stringify(seed, null, 1));
console.log(`done: ${hits} codes with results, seed ${before} -> ${Object.keys(seed).length} stations`);
