// Firebase data layer: auth, live listeners, CRUD. `#demo` hash = read-only demo from demo.json (local testing only).
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { initializeAuth, browserLocalPersistence, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, onSnapshot, addDoc, updateDoc, setDoc, getDoc, terminate, clearIndexedDbPersistence, serverTimestamp, query, orderBy, limit, getDocs, documentId } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './config.js';
import { r2 } from './util.js';

export const MAIN = '3743'; // DATS 24 Izegem
export const S = { user: null, demo: false, vehicles: [], fills: [], stations: [], days: [], meta: null, error: null };
const subs = new Set(); let tm;
export const onData = (f) => subs.add(f);
const fire = () => { clearTimeout(tm); tm = setTimeout(() => subs.forEach((f) => f()), 40); };

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, { persistence: browserLocalPersistence }); // no popup/redirect resolver => no third-party iframe/scripts (strict CSP)
const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
const guard = () => { if (S.demo) throw new Error('Demo-modus: opslaan staat uit'); };

export const vehicle = (id) => S.vehicles.find((v) => v.id === id);
export const station = (id) => S.stations.find((s) => s.id === id);
export const activeFills = () => S.fills.filter((f) => !f.deleted);
// market price of main station on a date (latest known day <= date that has this fuel)
export function priceOn(date, fuel, maxDays = 7) { // ignore stale data (gaps in history)
  for (let i = S.days.length - 1; i >= 0; i--) {
    const d = S.days[i];
    if (d.date <= date && d.p?.[fuel] != null) return (new Date(date) - new Date(d.date)) / 864e5 <= maxDays ? d.p[fuel] : null;
  }
  return null;
}

function listen() {
  const err = (e) => { S.error = e.code === 'permission-denied' ? 'Geen toegang: bevestig je e-mail of gebruik het toegelaten account.' : e.message; fire(); };
  const list = (path, key, sort) => onSnapshot(collection(db, path), (s) => { S[key] = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort(sort); fire(); }, err);
  list('vehicles', 'vehicles', (a, b) => (a.order ?? 0) - (b.order ?? 0));
  list('fillups', 'fills', (a, b) => (b.date + (b.createdAt?.seconds || 0)).localeCompare(a.date + (a.createdAt?.seconds || 0)));
  list('stations', 'stations', (a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0) || a.name.localeCompare(b.name));
  onSnapshot(collection(db, `stations/${MAIN}/days`), (s) => { S.days = s.docs.map((d) => ({ date: d.id, p: d.data().p })).sort((a, b) => a.date.localeCompare(b.date)); fire(); }, err);
  onSnapshot(doc(db, 'meta/scrape'), (d) => { S.meta = d.data() || null; fire(); }, () => {});
}

async function loadDemo() {
  const j = await (await fetch('demo.json')).json();
  Object.assign(S, j, { demo: true, user: { email: 'demo' } }); fire();
}

export function startAuth(cb) {
  if (location.search.includes('demo')) return loadDemo().then(() => cb({ status: 'in' })).catch(() => cb({ status: 'out' }));
  let listening = false;
  onAuthStateChanged(auth, (u) => {
    S.user = u;
    if (!u) return cb({ status: 'out' });
    if (!u.emailVerified) return cb({ status: 'verify', user: u });
    if (!listening) { listening = true; listen(); }
    cb({ status: 'in' });
  });
}
export const signIn = (e, p) => signInWithEmailAndPassword(auth, e, p);
export const signUp = async (e, p) => { const c = await createUserWithEmailAndPassword(auth, e, p); await sendEmailVerification(c.user); };
export const resend = () => sendEmailVerification(auth.currentUser);
export const reset = (e) => sendPasswordResetEmail(auth, e);
export async function logout() { // also wipe the offline data cache so nothing stays on a shared device
  await signOut(auth);
  try { await terminate(db); await clearIndexedDbPersistence(db); } catch {}
  location.reload();
}
export async function confirmVerified() { await auth.currentUser.reload(); await auth.currentUser.getIdToken(true); location.reload(); }

// ---- writes (soft delete only: nothing is ever physically removed)
export async function addFill(o) { guard(); return addDoc(collection(db, 'fillups'), { ...o, total: r2(o.liters * o.ppl), src: o.src || 'manual', createdAt: serverTimestamp() }); }
export async function updateFill(id, o) { guard(); if (o.liters != null && o.ppl != null) o.total = r2(o.liters * o.ppl); return updateDoc(doc(db, 'fillups', id), { ...o, updatedAt: serverTimestamp() }); }
export const trashFill = (id, flag = true) => updateFill(id, { deleted: flag });
export async function saveTicket(img) { guard(); return (await addDoc(collection(db, 'tickets'), { img, createdAt: serverTimestamp() })).id; }
export async function getTicket(id) { const d = await getDoc(doc(db, 'tickets', id)); return d.exists() ? d.data().img : null; }
export async function saveVehicle(id, o) { guard(); return setDoc(doc(db, 'vehicles', id), o, { merge: true }); }

export async function stationDays(id, n = 120) {
  if (S.demo) return [];
  const s = await getDocs(query(collection(db, `stations/${id}/days`), orderBy(documentId(), 'desc'), limit(n)));
  return s.docs.map((d) => ({ date: d.id, p: d.data().p })).reverse();
}
export const exportAll = () => JSON.stringify({ exportedAt: new Date().toISOString(), vehicles: S.vehicles, fills: S.fills, stations: S.stations.map(({ id, name, address, lat, lng, last }) => ({ id, name, address, lat, lng, last })), days: S.days }, null, 1);
