import { S, onData, startAuth, signIn, signUp, resend, reset, logout, confirmVerified } from './data.js';
import { $, $$, ago, esc } from './util.js';
import { initCharts, killCharts } from './charts.js';
import { V, svg, LOGO, closeModal } from './views.js';

const NAV = [['overzicht', 'Overzicht', 'home'], ['tanken', 'Tanken', 'plus'], ['historiek', 'Historiek', 'list'], ['stats', 'Statistieken', 'chart'], ['prijzen', 'Prijzen', 'tag'], ['instellingen', 'Instellingen', 'gear']];
const authMsg = (t, c = '') => { const m = $('#authMsg'); if (m) { m.textContent = t; m.className = c; } };
const ERR = { 'auth/invalid-credential': 'E-mail of wachtwoord klopt niet.', 'auth/invalid-email': 'Ongeldig e-mailadres.', 'auth/email-already-in-use': 'Dit e-mailadres heeft al een account — log in.', 'auth/weak-password': 'Kies een wachtwoord van minstens 6 tekens.', 'auth/too-many-requests': 'Te veel pogingen, wacht even.', 'auth/operation-not-allowed': 'E-mail-login staat nog uit in Firebase Console (Authentication → Aanmeldmethode).', 'auth/configuration-not-found': 'Authentication is nog niet gestart in Firebase Console (Authentication → Aan de slag).', 'auth/network-request-failed': 'Geen internetverbinding.' };

function authScreen(mode = 'in') {
  $('#app').hidden = true; const a = $('#auth'); a.hidden = false;
  a.innerHTML = `<div class="card auth-card"><div class="logo-big" style="margin:auto">${LOGO}</div><h1>TankBuddy</h1><p class="muted" style="margin:0">${mode === 'up' ? 'Maak je account' : 'Log in om je tankbeurten te zien'}</p>
    <form id="af"><div class="field"><label>E-mail</label><input type="email" name="e" autocomplete="email" required></div><div class="field"><label>Wachtwoord</label><input type="password" name="p" autocomplete="${mode === 'up' ? 'new-password' : 'current-password'}" required></div>
    <button class="btn grad big" type="submit">${mode === 'up' ? 'Account maken' : 'Inloggen'}</button></form>
    <div class="auth-links"><a id="sw">${mode === 'up' ? 'Ik heb al een account' : 'Account maken'}</a><a id="fg">Wachtwoord vergeten</a></div><div id="authMsg"></div></div>`;
  $('#sw').onclick = () => authScreen(mode === 'up' ? 'in' : 'up');
  $('#fg').onclick = async () => { const e = $('#af').e.value; if (!e) return authMsg('Vul eerst je e-mail in.', 'bad'); try { await reset(e); authMsg('Reset-mail verstuurd.', 'ok'); } catch (x) { authMsg(ERR[x.code] || x.message, 'bad'); } };
  $('#af').onsubmit = async (ev) => {
    ev.preventDefault(); authMsg('Bezig…');
    try { mode === 'up' ? await signUp(ev.target.e.value, ev.target.p.value) : await signIn(ev.target.e.value, ev.target.p.value); } catch (x) { authMsg(ERR[x.code] || x.message, 'bad'); }
  };
}
function verifyScreen(user) {
  $('#app').hidden = true; const a = $('#auth'); a.hidden = false;
  a.innerHTML = `<div class="card auth-card"><div class="logo-big" style="margin:auto">${LOGO}</div><h1>Bevestig je e-mail</h1><p class="muted">We stuurden een bevestigingslink naar<br><b style="color:var(--text)">${esc(user.email)}</b>.<br>Klik op de link (check ook spam) en kom dan terug.</p>
    <button class="btn grad big" id="vd">Ik heb bevestigd</button><button class="btn big" id="vr">Mail opnieuw sturen</button><div class="auth-links"><a id="vo">Uitloggen</a></div><div id="authMsg"></div></div>`;
  $('#vd').onclick = async () => { await confirmVerified(); };
  $('#vr').onclick = async () => { try { await resend(); authMsg('Verstuurd ✓', 'ok'); } catch (x) { authMsg(ERR[x.code] || x.message, 'bad'); } };
  $('#vo').onclick = () => logout();
}

let shell = false;
function buildShell() {
  if (shell) return; shell = true;
  $('#side').innerHTML = `<div class="brand">${LOGO}<span>TankBuddy</span></div>` + NAV.map(([id, l, ic]) => `<a class="nav" href="#/${id}" data-r="${id}">${svg(ic)}<span>${l}</span></a>`).join('') + '<div class="side-foot" id="sideFoot"></div>';
  const t = ['overzicht', 'historiek', 'tanken', 'stats', 'prijzen'];
  $('#tabs').innerHTML = t.map((id) => { const [, l, ic] = NAV.find((n) => n[0] === id); return id === 'tanken' ? `<a class="fab" href="#/tanken" data-r="tanken" title="Tanken">${svg(ic)}</a>` : `<a href="#/${id}" data-r="${id}">${svg(ic)}<span>${l}</span></a>`; }).join('');
  $('#gear').innerHTML = svg('gear');
}
const route = () => (location.hash.replace(/^#\/?/, '').split('?')[0] || 'overzicht');

function render(full = true) {
  const r = V[route()] ? route() : 'overzicht', v = V[r];
  $$('[data-r]').forEach((a) => a.classList.toggle('on', a.dataset.r === r));
  $('#title').textContent = v.title; document.title = 'TankBuddy · ' + v.title;
  const m = S.meta?.lastRun, hrs = m ? (Date.now() - (m.toDate ? m.toDate() : new Date(m))) / 36e5 : 99;
  $('#status').innerHTML = `<i class="dot ${hrs > 36 ? 'old' : ''}"></i><span class="lbl">Prijzen: ${ago(m)}</span>`;
  $('#sideFoot').innerHTML = `${S.demo ? 'DEMO · ' : ''}${S.user?.email || ''}<br>${S.stations.length} stations · ${S.fills.filter((f) => !f.deleted).length} tankbeurten`;
  $('#err').innerHTML = S.error ? `<div class="banner">${esc(S.error)}</div>` : '';
  if (!full) return;
  killCharts(); $('#view').innerHTML = v.html(); v.after?.(); scrollTo(0, 0);
}
const typing = () => { const a = document.activeElement; return a && /INPUT|SELECT|TEXTAREA/.test(a.tagName) && $('#view').contains(a); };

addEventListener('hashchange', () => { closeModal(); render(); });
onData(() => { const v = V[route()]; render(!(v?.keepOnData || typing() || !$('#modal').hidden)); });
initCharts();
startAuth((st) => {
  if (st.status === 'in') { $('#auth').hidden = true; $('#app').hidden = false; buildShell(); render(); }
  else if (st.status === 'verify') verifyScreen(st.user);
  else authScreen();
});
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !location.search.includes('demo')) navigator.serviceWorker.register('sw.js').catch(() => {});
