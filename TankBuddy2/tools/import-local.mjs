// Imports the old TankBuddy JSON files into Firestore. READ-ONLY on the JSON files.
// Idempotent: only creates documents that don't exist yet, never overwrites.
// Usage: node import-local.mjs [--commit] [--dir <folder>] [--msi]
//   default = dry run on the hash-verified backup folder. --msi also merges the *-MSI*.json files.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';
import { serviceAccount } from './key.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const args = process.argv.slice(2);
const commit = args.includes('--commit');
const withMsi = args.includes('--msi');
const dir = args.includes('--dir') ? args[args.indexOf('--dir') + 1] : path.join(root, 'Backup files', '2026-10-15_pre-firebase');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const FUEL = { 'euro 95': 'euro95', euro95: 'euro95', 'euro 98': 'euro98', euro98: 'euro98', diesel: 'diesel', 'euro 102': 'euro102' };
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const PLATES = { 'BMW X6': '1-WBQ-481', 'Renault Trafic': '2-DGR-447', 'Citroën Berlingo': 'XEK-657' };
const COLORS = ['#8b5cf6', '#22d3ee', '#f472b6', '#fbbf24', '#34d399'];
const r2 = (n) => Math.round(n * 100) / 100;

const readLines = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l)) : [];
const readJson = (f) => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];

// ---- fill-ups
const tankFiles = ['tankgeschiedenis.json', ...(withMsi ? ['tankgeschiedenis-MSI.json'] : [])];
const fills = new Map(); const stats = {};
for (const f of tankFiles) {
  let added = 0, dup = 0;
  for (const t of readLines(path.join(dir, f))) {
    const vehicleId = slug(t.Voertuig);
    const date = String(t.Datum).slice(0, 10);
    const key = `${vehicleId}|${date}|${t.Liters.toFixed(2)}|${t.PrijsPerLiter.toFixed(3)}`;
    const id = crypto.createHash('sha1').update(key).digest('hex').slice(0, 20);
    if (fills.has(id)) { dup++; continue; }
    added++;
    fills.set(id, { vehicleId, vehicleName: t.Voertuig, date, liters: t.Liters, ppl: t.PrijsPerLiter, total: r2(t.Liters * t.PrijsPerLiter),
      fuel: FUEL[String(t.Brandstof).toLowerCase()] || slug(t.Brandstof), consumption: t.Verbruik ?? null, stationId: null, src: 'import' });
  }
  stats[f] = { added, dup };
}

// ---- vehicles
const vehicles = new Map();
[...fills.values()].forEach((x) => { if (!vehicles.has(x.vehicleId)) vehicles.set(x.vehicleId, { name: x.vehicleName, plate: PLATES[x.vehicleName] || '', fuel: x.fuel, trackConsumption: true, color: COLORS[vehicles.size % COLORS.length], order: vehicles.size }); });

// ---- Izegem price history (DATS 24 Izegem = carbu id 3743)
const priceFiles = ['prijsgeschiedenis.json', ...(withMsi ? ['prijsgeschiedenis-MSI.json', 'prijsgeschiedenis-MSI-2.json'] : [])];
const days = new Map(); let conflicts = 0;
for (const f of priceFiles) {
  let added = 0;
  for (const r of readJson(path.join(dir, f))) {
    const [d, m, y] = r.Datum.split('-'); const iso = `${y}-${m}-${d}`;
    const fuel = FUEL[r.Brandstof.toLowerCase()]; const val = parseFloat(String(r.Prijs).replace(',', '.'));
    if (!fuel || !isFinite(val)) continue;
    const p = days.get(iso) || {};
    if (p[fuel] === undefined) { p[fuel] = val; added++; } else if (p[fuel] !== val) conflicts++;
    days.set(iso, p);
  }
  stats[f] = { added };
}

console.log(`Source: ${dir}`);
console.log('Vehicles:', [...vehicles.values()].map((v) => v.name).join(', '));
console.log('Fill-ups:', fills.size, '| price days:', days.size, '| price conflicts (kept first):', conflicts);
console.log('Per file:', JSON.stringify(stats));
if (!commit) { console.log('\nDRY RUN — nothing written. Re-run with --commit.'); process.exit(0); }

// ---- write (create-only)
const existing = async (col) => new Set((await db.collection(col).select().get()).docs.map((d) => d.id));
const exV = await existing('vehicles'), exF = await existing('fillups');
const exD = new Set((await db.collection('stations/3743/days').select().get()).docs.map((d) => d.id));
let batch = db.batch(), n = 0, w = { vehicles: 0, fillups: 0, days: 0 };
const queue = async (ref, data, k) => { batch.create(ref, data); w[k]++; if (++n % 400 === 0) { await batch.commit(); batch = db.batch(); } };
const now = admin.firestore.FieldValue.serverTimestamp();
for (const [id, v] of vehicles) if (!exV.has(id)) await queue(db.doc(`vehicles/${id}`), v, 'vehicles');
for (const [id, f] of fills) if (!exF.has(id)) await queue(db.doc(`fillups/${id}`), { ...f, createdAt: now }, 'fillups');
if (!(await db.doc('stations/3743').get()).exists) await db.doc('stations/3743').create({ name: 'DATS 24 Izegem', brand: 'DATS24', address: 'Krekelmotestraat 147, 8870 Izegem', lat: 50.915335846779, lng: 3.1977126770171, isMain: true, updatedAt: now });
for (const [iso, p] of days) if (!exD.has(iso)) await queue(db.doc(`stations/3743/days/${iso}`), { p, src: 'import', ts: now }, 'days');
await batch.commit();
console.log('WRITTEN (new docs only):', JSON.stringify(w));
const [v, f, d] = await Promise.all([db.collection('vehicles').count().get(), db.collection('fillups').count().get(), db.collection('stations/3743/days').count().get()]);
console.log('FIRESTORE NOW: vehicles', v.data().count, '| fillups', f.data().count, '| price days', d.data().count);

