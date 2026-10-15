// Auto-updater (same design as the Bean planner): the service worker (skipWaiting + clients.claim) takes over a new deploy by itself;
// we re-check at most every 30 min when online, and reload onto the new build only at a safe moment: nothing being edited and the app
// hidden, or just returned after >= 60 s away. Settings has a manual "Controleer op updates" that reloads as soon as it is safe.
export const CHECK_MS = 30 * 60e3, AWAY_MS = 60e3, GAP_MS = 30e3;
export let status = 'idle'; // idle | checking | downloading | uptodate | error | unsupported
const subs = new Set(); export const onStatus = (f) => subs.add(f);
const set = (s) => { status = s; subs.forEach((f) => f(s)); };
const supported = 'serviceWorker' in navigator && location.protocol.startsWith('http') && !location.search.includes('demo');
if (!supported) status = 'unsupported';
let reg = null, ready = false, lastCheck = 0, hiddenAt = document.hidden ? Date.now() : null, userAsked = false, hadCtl = !!navigator.serviceWorker?.controller;

// busy = an open dialog or a field being typed in: never reload then
const busy = () => { const m = document.getElementById('modal'); const a = document.activeElement; return !!(m && !m.hidden) || !!(a && /INPUT|SELECT|TEXTAREA/.test(a.tagName)); };
function apply() { // guarded reload (never loops)
  try { if (Date.now() - Number(sessionStorage.getItem('updReload') || 0) < GAP_MS) return; sessionStorage.setItem('updReload', Date.now()); } catch {}
  location.reload();
}
function evaluate(away = null) {
  if (!ready || busy()) return;
  if (userAsked || document.hidden || (away != null && away >= AWAY_MS)) apply();
}
export async function check(manual = false) {
  if (!supported || !reg || !navigator.onLine) { if (manual) set(supported ? 'error' : 'unsupported'); return; }
  if (manual) userAsked = true;
  if (ready) { set('downloading'); return evaluate(); }
  lastCheck = Date.now(); if (manual) set('checking');
  try {
    await reg.update();
    if (reg.installing || reg.waiting) { if (manual) set('downloading'); } else if (manual) set('uptodate');
  } catch { if (manual) set('error'); }
}
export function startUpdater() {
  if (!supported) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadCtl) { hadCtl = true; return; } ready = true; set('downloading'); evaluate(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); setTimeout(() => evaluate(), 3000); return; }
    const away = hiddenAt ? Date.now() - hiddenAt : null; hiddenAt = null;
    if (Date.now() - lastCheck >= CHECK_MS) check(); // a new build found here takes over -> controllerchange -> evaluate
    evaluate(away);
  });
  addEventListener('online', () => Date.now() - lastCheck >= CHECK_MS && check());
  navigator.serviceWorker.register('sw.js').then((r) => { reg = r; check(); }).catch(() => {});
}
