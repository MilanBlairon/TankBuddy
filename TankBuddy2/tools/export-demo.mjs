// LOCAL TESTING ONLY: dumps Firestore to public/demo.json for the ?demo UI preview. demo.json is excluded from deploy + git.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';
import { serviceAccount } from './key.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const rows = async (p) => (await db.collection(p).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
const clean = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v && v._seconds !== undefined ? { seconds: v._seconds, toDate: undefined } : v)));
const [vehicles, fills, stations, days] = await Promise.all([rows('vehicles'), rows('fillups'), rows('stations'), rows('stations/3743/days')]);
fills.sort((a, b) => b.date.localeCompare(a.date));
const out = clean({ vehicles, fills, stations, days: days.map((d) => ({ date: d.id, p: d.p })).sort((a, b) => a.date.localeCompare(b.date)), meta: { stationCount: stations.length, lastRun: null } });
fs.writeFileSync(path.join(here, '..', 'public', 'demo.json'), JSON.stringify(out));
console.log('demo.json:', vehicles.length, 'vehicles,', fills.length, 'fills,', stations.length, 'stations,', days.length, 'days');

