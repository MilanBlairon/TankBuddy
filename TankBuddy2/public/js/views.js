import { S, MAIN, vehicle, station, activeFills, priceOn, addFill, updateFill, trashFill, saveVehicle, stationDays, exportAll } from './data.js';
import { $, $$, esc, eur, num, ppl, iso, addDays, dmy, dmyLong, parseNum, sum, r2, slug, monthLabel, FUELS, PUMP_FUELS, fuelLabel, fuelColor, km, toast, ago, download, debounce } from './util.js';
import { mk, spark, gradient } from './charts.js';
import { scanTicket } from './ocr.js';

export const ICON = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  cam: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
  undo: '<path d="M3 7v6h6M3.5 13A9 9 0 1 0 6 6.3L3 9"/>',
  down: '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
};
export const svg = (n, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${ICON[n]}</svg>`;
export const LOGO = '<svg viewBox="0 0 48 48"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs><rect width="48" height="48" rx="14" fill="url(#lg)"/><path d="M24 9c6.4 7.6 10 12.4 10 17.5a10 10 0 0 1-20 0C14 21.4 17.6 16.6 24 9z" fill="#fff" fill-opacity=".95"/><path d="M19.5 27.5a4.5 4.5 0 0 0 4.5 4.5" stroke="#8b5cf6" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>';

const pill = (f) => `<span class="pill" style="--c:${fuelColor(f)}">${esc(fuelLabel(f))}</span>`;
const vName = (f) => vehicle(f.vehicleId)?.name || f.vehicleName || '?';
const vColor = (f) => vehicle(f.vehicleId)?.color || '#8b5cf6';
const wavg = (fs) => { const l = sum(fs, 'liters'); return l ? sum(fs, 'total') / l : null; };
const short = (n) => (n || '').replace(/^DATS ?24 ?/i, '') || n;
const empty = (t) => `<div class="empty">${t}</div>`;

export function openModal(html, mount) {
  const m = $('#modal'); m.innerHTML = `<div class="box">${html}</div>`; m.hidden = false;
  m.onclick = (e) => { if (e.target === m) closeModal(); };
  mount?.($('.box', m));
}
export const closeModal = () => { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; };
addEventListener('keydown', (e) => e.key === 'Escape' && closeModal());

/* ---------- shared fill form ---------- */
function formHTML(f = {}) {
  const v0 = f.vehicleId || S.vehicles[0]?.id, fuel0 = f.fuel || vehicle(v0)?.fuel || 'euro95';
  const main = station(MAIN), others = S.stations.filter((s) => s.id !== MAIN).sort((a, b) => a.name.localeCompare(b.name));
  const st = f.stationId === undefined ? MAIN : f.stationId;
  const v = (x) => (x == null ? '' : String(x).replace('.', ','));
  return `
  <div class="field"><label>Voertuig</label><div class="chips" data-g="vehicleId">${S.vehicles.map((x) => `<button type="button" class="chip ${x.id === v0 ? 'on' : ''}" data-v="${esc(x.id)}" style="--c:${x.color || '#8b5cf6'}">${esc(x.name)}</button>`).join('') || '<span class="muted">Voeg eerst een voertuig toe in Instellingen.</span>'}</div></div>
  <div class="row2"><div class="field"><label>Datum</label><input type="date" name="date" value="${f.date || iso()}" max="${iso(addDays(new Date(), 1))}"></div>
  <div class="field"><label>Brandstof</label><div class="chips" data-g="fuel">${PUMP_FUELS.map((k) => `<button type="button" class="chip ${k === fuel0 ? 'on' : ''}" data-v="${k}" style="--c:${fuelColor(k)}">${fuelLabel(k)}</button>`).join('')}</div></div></div>
  <div class="row3"><div class="field"><label>Liters</label><input name="liters" inputmode="decimal" placeholder="0,00" value="${v(f.liters)}"></div>
  <div class="field"><label>€ per liter</label><input name="ppl" inputmode="decimal" placeholder="0,000" value="${v(f.ppl)}"></div>
  <div class="field"><label>Totaal €</label><input name="total" inputmode="decimal" placeholder="0,00" value="${v(f.total)}"></div></div>
  <div class="field consField"><label>Verbruik L/100 km <span class="muted">(optioneel)</span></label><input name="consumption" inputmode="decimal" placeholder="bv. 9,5" value="${v(f.consumption)}"></div>
  <div class="field"><label>Tankstation</label><select name="stationId"><option value="">Onbekend / ander station</option>${main ? `<option value="${MAIN}" ${st === MAIN ? 'selected' : ''}>${esc(main.name)} (standaard)</option>` : ''}${others.map((s) => `<option value="${s.id}" ${st === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
  <div class="hint" id="mkt"></div>`;
}
const chipVal = (root, g) => $(`[data-g=${g}] .chip.on`, root)?.dataset.v;
function setChip(root, g, val) { $$(`[data-g=${g}] .chip`, root).forEach((c) => c.classList.toggle('on', c.dataset.v === val)); }
function bindForm(root, editing) {
  const q = (n) => $(`[name=${n}]`, root);
  const sync = () => { const v = vehicle(chipVal(root, 'vehicleId')); $('.consField', root).hidden = v ? v.trackConsumption === false : false; hint(); };
  const hint = () => {
    const m = priceOn(q('date').value, chipVal(root, 'fuel')), p = parseNum(q('ppl').value), h = $('#mkt', root); if (!h) return;
    h.innerHTML = m == null ? '' : `Markt Izegem (${dmy(q('date').value)}): <b>${ppl(m)}</b>` + (p > 0 ? ` · jij: <b class="${p <= m ? 'down' : 'up'}">${Math.abs((p - m) * 100).toFixed(1).replace('.', ',')} ct/L ${p <= m ? 'onder' : 'boven'} markt</b>` : '');
  };
  root.addEventListener('click', (e) => {
    const c = e.target.closest('.chip'); if (!c) return; const g = c.parentElement.dataset.g;
    setChip(root, g, c.dataset.v);
    if (g === 'vehicleId' && !editing) { const v = vehicle(c.dataset.v); if (v?.fuel) setChip(root, 'fuel', v.fuel); }
    sync();
  });
  const calc = (e) => {
    const l = parseNum(q('liters').value), p = parseNum(q('ppl').value), t = parseNum(q('total').value);
    if (e.target.name === 'total' && l > 0 && t > 0) q('ppl').value = (t / l).toFixed(3).replace('.', ',');
    else if (l > 0 && p > 0) q('total').value = (l * p).toFixed(2).replace('.', ',');
    hint();
  };
  ['liters', 'ppl', 'total'].forEach((n) => q(n).addEventListener('input', calc));
  q('date').addEventListener('change', hint);
  sync();
}
function readForm(root) {
  const q = (n) => $(`[name=${n}]`, root).value;
  const o = { vehicleId: chipVal(root, 'vehicleId'), date: q('date'), fuel: chipVal(root, 'fuel'), liters: parseNum(q('liters')), ppl: parseNum(q('ppl')), stationId: q('stationId') || null };
  if (!o.vehicleId) throw new Error('Kies een voertuig');
  if (!o.date) throw new Error('Kies een datum');
  if (!(o.liters > 0 && o.liters < 400)) throw new Error('Liters klopt niet');
  if (!(o.ppl > 0.5 && o.ppl < 6)) throw new Error('Prijs per liter klopt niet');
  o.vehicleName = vehicle(o.vehicleId)?.name || '';
  const c = parseNum(q('consumption')); o.consumption = vehicle(o.vehicleId)?.trackConsumption === false || isNaN(c) ? null : c;
  return o;
}

/* ---------- views ---------- */
export const V = {};

V.overzicht = {
  title: 'Overzicht',
  html() {
    const F = activeFills(), now = new Date(), ym = iso(now).slice(0, 7), pm = iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)).slice(0, 7);
    const m = F.filter((f) => f.date.startsWith(ym)), p = F.filter((f) => f.date.startsWith(pm));
    const sm = sum(m, 'total'), sp = sum(p, 'total'), dl = sp ? ((sm - sp) / sp) * 100 : null;
    const y = F.filter((f) => f.date >= iso(addDays(now, -365)));
    const prices = ['euro95', 'euro98', 'diesel'].map((k) => {
      const ser = S.days.filter((d) => d.p?.[k] != null), cur = ser.at(-1), prev = ser.at(-2);
      if (!cur) return `<div class="card pcard" style="--c:${fuelColor(k)}"><div class="lbl"><i></i>${fuelLabel(k)}</div><div class="val muted">–</div></div>`;
      const d = prev ? cur.p[k] - prev.p[k] : 0;
      return `<div class="card pcard" style="--c:${fuelColor(k)}"><div class="lbl"><i></i>${fuelLabel(k)} · Izegem</div>
        <div class="val">${ppl(cur.p[k])} <small>€/L</small></div>
        <small class="${d > 0.0004 ? 'up' : d < -0.0004 ? 'down' : 'muted'}">${d > 0.0004 ? '▲' : d < -0.0004 ? '▼' : '•'} ${d ? (Math.abs(d) * 100).toFixed(1).replace('.', ',') + ' ct' : 'ongewijzigd'} <span class="muted">· ${dmy(cur.date)}</span></small>
        ${spark(ser.slice(-45).map((x) => x.p[k]), fuelColor(k))}</div>`;
    }).join('');
    const vcards = S.vehicles.map((v) => {
      const fs = F.filter((f) => f.vehicleId === v.id), last = fs[0], cs = fs.filter((f) => f.consumption != null).slice(0, 6), avg = cs.length ? sum(cs, 'consumption') / cs.length : null;
      return `<div class="vcard" style="--c:${v.color}"><div class="av">${esc(v.name.slice(0, 2).toUpperCase())}</div>
        <div class="m"><b>${esc(v.name)}</b><span class="muted small">${last ? `Laatst ${dmy(last.date)} · ${num(last.liters, 1)} L · ${eur(last.total)}` : 'Nog geen tankbeurten'}</span></div>
        <div class="r"><b>${v.trackConsumption === false ? eur(sum(fs.filter((f) => f.date >= iso(addDays(now, -365))), 'total'), 0) : avg ? num(avg, 1) : '–'}</b><span class="muted small">${v.trackConsumption === false ? '12 mnd' : 'L/100 km'}</span></div></div>`;
    }).join('');
    return `
    <section class="card hero"><div style="z-index:1"><div class="muted">Uitgegeven in ${monthLabel(ym)}</div><div class="big">${eur(sm)}</div>
      <div class="small ${dl > 0 ? 'up' : 'down'}" style="margin-top:8px">${dl == null ? '&nbsp;' : (dl > 0 ? '▲ ' : '▼ ') + num(Math.abs(dl), 0) + '% t.o.v. vorige maand (' + eur(sp, 0) + ')'}</div></div>
      <div class="stats"><div class="stat"><b>${m.length}</b><span>tankbeurten</span></div><div class="stat"><b>${num(sum(m, 'liters'), 0)} L</b><span>liters</span></div><div class="stat"><b>${m.length ? ppl(wavg(m)) : '–'}</b><span>gem. €/L</span></div><div class="stat"><b>${eur(sum(y, 'total'), 0)}</b><span>laatste 12 maanden</span></div></div></section>
    <div class="grid3">${prices}</div>
    <div class="grid2"><div class="card"><h3>Kost per tankbeurt <span class="muted small">laatste 16</span></h3><div class="chart"><canvas id="cCost"></canvas></div></div>
      <div class="card"><h3>Voertuigen <a class="small" href="#/tanken">+ tanken</a></h3>${vcards || empty('Geen voertuigen')}</div></div>`;
  },
  after() {
    const last = activeFills().slice(0, 16).reverse();
    mk('cCost', { type: 'bar', data: { labels: last.map((f) => dmy(f.date).slice(0, 5)), datasets: [{ data: last.map((f) => f.total), borderRadius: 8, backgroundColor: (c) => { const f = last[c.dataIndex]; return f ? vColor(f) : '#8b5cf6'; } }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { title: (i) => dmyLong(last[i[0].dataIndex].date) + ' · ' + vName(last[i[0].dataIndex]), label: (i) => { const f = last[i.dataIndex]; return [`${eur(f.total)}`, `${num(f.liters, 1)} L × ${ppl(f.ppl)}`]; } } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => '€' + v } } } } });
  },
};

V.tanken = {
  title: 'Tanken',
  keepOnData: true,
  html() {
    return `<div class="grid2">
    <div class="card scan"><div class="ico">${svg('cam')}</div><h3 style="justify-content:center;margin:0">Scan je tankbon</h3>
      <p class="muted" style="margin:0 0 6px">Maak een foto van de bon: liters, prijs en datum worden automatisch ingevuld. Jij kiest enkel het voertuig en het verbruik.</p>
      <label class="btn grad"><input type="file" id="ticket" accept="image/*" capture="environment" hidden>${svg('cam')} Foto nemen / kiezen</label>
      <div id="scanPrev"></div><div class="bar" id="scanBar" hidden><i></i></div><div class="small muted" id="scanMsg"></div>
      <details id="raw" hidden><summary class="small muted">Ruwe OCR-tekst</summary><pre id="rawTxt"></pre></details></div>
    <form class="card" id="fillForm" novalidate><h3>Tankbeurt</h3>${formHTML()}<button class="btn grad big" type="submit">Opslaan</button></form></div>`;
  },
  after() {
    const form = $('#fillForm'); bindForm(form);
    form.onsubmit = async (e) => {
      e.preventDefault();
      try { const o = readForm(form); o.src = form.dataset.src || 'manual'; await addFill(o); toast('Tankbeurt opgeslagen ✓'); location.hash = '#/historiek'; }
      catch (err) { toast(err.message, true); }
    };
    $('#ticket').onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      $('#scanPrev').innerHTML = `<img src="${URL.createObjectURL(file)}" alt="tankbon">`;
      const bar = $('#scanBar'), msg = $('#scanMsg'); bar.hidden = false; msg.textContent = 'Bon wordt gelezen… (eerste keer even geduld)';
      try {
        const r = await scanTicket(file, (p) => ($('i', bar).style.width = Math.round(p * 100) + '%'));
        const { parseTicket } = await import('./ocr.js'); const t = parseTicket(r.text, S.stations);
        const set = (n, v) => v != null && ($(`[name=${n}]`, form).value = String(v).replace('.', ','));
        set('liters', t.liters); set('ppl', t.ppl); set('total', t.total); if (t.date) $('[name=date]', form).value = t.date;
        if (t.fuel) setChip(form, 'fuel', t.fuel); if (t.stationId) $('[name=stationId]', form).value = t.stationId;
        form.dataset.src = 'ocr'; $('[name=liters]', form).dispatchEvent(new Event('input'));
        msg.innerHTML = t.confidence >= 1 ? '<span class="down">✓ Alles herkend — controleer en kies voertuig + verbruik.</span>' : t.confidence > 0 ? '<span style="color:var(--amber)">Gedeeltelijk herkend — controleer de waarden.</span>' : '<span class="up">Niets betrouwbaars herkend — probeer een scherpere, rechte foto of vul manueel in.</span>';
        $('#rawTxt').textContent = r.text; $('#raw').hidden = false;
      } catch (err) { msg.innerHTML = `<span class="up">${esc(err.message)}</span>`; }
      bar.hidden = true;
    };
  },
};

let hf = { v: 'all', trash: false, shown: 60 };
V.historiek = {
  title: 'Historiek',
  html() {
    const all = S.fills.filter((f) => (hf.trash ? f.deleted : !f.deleted) && (hf.v === 'all' || f.vehicleId === hf.v));
    const list = all.slice(0, hf.shown);
    const row = (f) => `<div class="frow" data-id="${f.id}" style="--c:${vColor(f)}"><div class="fdot"></div>
      <div><b>${esc(vName(f))}</b><span class="l2">${dmyLong(f.date)} · ${esc(fuelLabel(f.fuel))}${f.stationId && station(f.stationId) ? ' · ' + esc(short(station(f.stationId).name)) : ''}${f.src === 'ocr' ? ' · scan' : ''}</span></div>
      <div class="fnum">${num(f.liters)} L<span class="l2">× ${ppl(f.ppl)}</span></div>
      <div class="fcons">${f.consumption != null ? num(f.consumption, 1) + '<small>L/100</small>' : ''}</div>
      <div class="ftot">${eur(f.total)}</div>
      <div class="fact">${f.deleted ? `<button class="iconbtn" data-act="restore" title="Herstel">${svg('undo')}</button>` : `<button class="iconbtn" data-act="edit" title="Bewerk">${svg('edit')}</button><button class="iconbtn" data-act="trash" title="Naar prullenbak">${svg('trash')}</button>`}</div></div>`;
    return `<div class="card"><div style="display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap;margin-bottom:12px">
      <div class="chips" id="hv"><button class="chip ${hf.v === 'all' ? 'on' : ''}" data-v="all">Alle</button>${S.vehicles.map((v) => `<button class="chip ${hf.v === v.id ? 'on' : ''}" data-v="${v.id}" style="--c:${v.color}">${esc(v.name)}</button>`).join('')}</div>
      <button class="chip ${hf.trash ? 'on' : ''}" id="htrash" style="--c:#fb7185">${svg('trash', 'style="width:14px;height:14px;vertical-align:-2px"')} Prullenbak</button></div>
      <div class="muted small" style="margin:0 4px 8px">${all.length} tankbeurten · ${eur(sum(all, 'total'))} · ${num(sum(all, 'liters'), 0)} L</div>
      ${list.map(row).join('') || empty(hf.trash ? 'Prullenbak is leeg' : 'Nog geen tankbeurten')}
      ${all.length > hf.shown ? '<button class="btn sm" id="more" style="margin:12px auto 0;display:flex">Toon meer</button>' : ''}</div>`;
  },
  after() {
    const re = () => { $('#view').innerHTML = V.historiek.html(); V.historiek.after(); };
    $$('#hv .chip').forEach((c) => (c.onclick = () => { hf.v = c.dataset.v; hf.shown = 60; re(); }));
    $('#htrash').onclick = () => { hf.trash = !hf.trash; re(); };
    $('#more')?.addEventListener('click', () => { hf.shown += 100; re(); });
    $$('.frow [data-act]').forEach((b) => (b.onclick = async () => {
      const id = b.closest('.frow').dataset.id, f = S.fills.find((x) => x.id === id);
      try {
        if (b.dataset.act === 'trash') { await trashFill(id); toast('Naar prullenbak (herstelbaar)'); }
        else if (b.dataset.act === 'restore') { await trashFill(id, false); toast('Hersteld ✓'); }
        else openModal(`<h2>Tankbeurt bewerken <button class="iconbtn" id="mx">${svg('x')}</button></h2><form id="editForm" novalidate>${formHTML(f)}<button class="btn grad big" type="submit">Opslaan</button></form>`, (box) => {
          const form = $('#editForm', box); bindForm(form, true); $('#mx', box).onclick = closeModal;
          form.onsubmit = async (e) => { e.preventDefault(); try { await updateFill(id, readForm(form)); closeModal(); toast('Opgeslagen ✓'); } catch (err) { toast(err.message, true); } };
        });
      } catch (err) { toast(err.message, true); }
    }));
  },
};

let sr = 365;
V.stats = {
  title: 'Statistieken',
  html() {
    const F = activeFills(), cut = iso(addDays(new Date(), -365)), y = F.filter((f) => f.date >= cut);
    const tr = S.vehicles.filter((v) => v.trackConsumption !== false).map((v) => v.id), cs = F.filter((f) => f.consumption != null && tr.includes(f.vehicleId));
    const dl = F.map((f) => { const m = priceOn(f.date, f.fuel); return m == null ? null : { f, d: f.ppl - m }; }).filter(Boolean);
    const avgD = dl.length ? dl.reduce((t, x) => t + x.d, 0) / dl.length : null, saved = dl.reduce((t, x) => t - x.d * x.f.liters, 0);
    const kpi = (v, l, c = '') => `<div class="card kpi"><span>${l}</span><b class="${c}">${v}</b></div>`;
    return `<div class="grid4">${kpi(eur(sum(y, 'total'), 0), 'Uitgegeven (12 mnd)')}${kpi(num(sum(y, 'liters'), 0) + ' L', 'Liters (12 mnd)')}${kpi(ppl(wavg(y)), 'Gem. prijs per liter')}${kpi(y.length ? eur(sum(y, 'total') / y.length) : '–', 'Gem. per tankbeurt')}${kpi(cs.length ? num(sum(cs, 'consumption') / cs.length, 1) + ' L/100' : '–', 'Gem. verbruik')}${kpi(avgD == null ? '–' : (avgD <= 0 ? '−' : '+') + num(Math.abs(avgD) * 100, 1) + ' ct/L', 'Betaald vs. markt Izegem', avgD <= 0 ? 'down' : 'up')}</div>
    <div class="grid2"><div class="card"><h3>Kost per tankbeurt</h3><div class="chart"><canvas id="sCost"></canvas></div></div>
      <div class="card"><h3>Uitgaven per maand</h3><div class="chart"><canvas id="sMonth"></canvas></div></div></div>
    <div class="card" style="margin-bottom:16px"><h3>Brandstofprijs DATS 24 Izegem <span class="seg" id="sr">${[[90, '3M'], [365, '1J'], [9999, 'Alles']].map(([d, l]) => `<button data-d="${d}" class="${sr === d ? 'on' : ''}">${l}</button>`).join('')}</span></h3><div class="chart tall"><canvas id="sPrice"></canvas></div></div>
    <div class="grid2"><div class="card"><h3>Betaald t.o.v. markt <span class="muted small">ct/L, onder 0 = voordelig · totaal ${eur(Math.abs(saved))} ${saved >= 0 ? 'bespaard' : 'meer betaald'}</span></h3><div class="chart"><canvas id="sDelta"></canvas></div></div>
      <div class="card"><h3>Verbruik L/100 km</h3><div class="chart">${cs.length ? '<canvas id="sCons"></canvas>' : empty('Geen verbruiksdata (voertuigen met verbruik uit)')}</div></div></div>
    <div class="card"><h3>Uitgaven per voertuig <span class="muted small">12 maanden</span></h3><div class="chart sm"><canvas id="sVeh"></canvas></div></div>`;
  },
  after() {
    const F = activeFills().slice().reverse(), now = new Date();
    mk('sCost', { type: 'bar', data: { labels: F.slice(-30).map((f) => dmy(f.date).slice(0, 5)), datasets: [{ data: F.slice(-30).map((f) => f.total), borderRadius: 6, backgroundColor: (c) => { const f = F.slice(-30)[c.dataIndex]; return f ? vColor(f) : '#8b5cf6'; } }] }, options: { plugins: { legend: { display: false }, tooltip: { callbacks: { title: (i) => { const f = F.slice(-30)[i[0].dataIndex]; return dmyLong(f.date) + ' · ' + vName(f); }, label: (i) => { const f = F.slice(-30)[i.dataIndex]; return [eur(f.total), `${num(f.liters, 1)} L × ${ppl(f.ppl)}`]; } } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v) => '€' + v } } } } });
    const months = []; for (let i = 11; i >= 0; i--) months.push(iso(new Date(now.getFullYear(), now.getMonth() - i, 1)).slice(0, 7));
    mk('sMonth', { type: 'bar', data: { labels: months.map(monthLabel), datasets: S.vehicles.map((v) => ({ label: v.name, backgroundColor: v.color, borderRadius: 4, stack: 's', data: months.map((m) => r2(sum(F.filter((f) => f.vehicleId === v.id && f.date.startsWith(m)), 'total'))) })) }, options: { plugins: { legend: { position: 'bottom' } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: (v) => '€' + v } } } } });
    const drawPrice = () => {
      const ds = S.days.filter((d) => d.date >= iso(addDays(now, -sr))), ctx = $('#sPrice')?.getContext('2d'); if (!ctx) return;
      mk('sPrice', { type: 'line', data: { labels: ds.map((d) => dmy(d.date)), datasets: ['euro95', 'euro98', 'diesel'].map((k) => ({ label: fuelLabel(k), data: ds.map((d) => d.p?.[k] ?? null), borderColor: fuelColor(k), backgroundColor: gradient(ctx, fuelColor(k), 340), fill: true, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2, tension: .3, spanGaps: true })) }, options: { interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (i) => `${i.dataset.label}: ${ppl(i.parsed.y)} €/L` } } }, scales: { x: { ticks: { maxTicksLimit: 8 }, grid: { display: false } }, y: { ticks: { callback: (v) => v.toFixed(2) } } } } });
    };
    drawPrice(); $$('#sr button').forEach((b) => (b.onclick = () => { sr = +b.dataset.d; $$('#sr button').forEach((x) => x.classList.toggle('on', x === b)); drawPrice(); }));
    const dl = F.map((f) => { const m = priceOn(f.date, f.fuel); return m == null ? null : { f, d: (f.ppl - m) * 100 }; }).filter(Boolean).slice(-40);
    mk('sDelta', { type: 'bar', data: { labels: dl.map((x) => dmy(x.f.date).slice(0, 5)), datasets: [{ data: dl.map((x) => +x.d.toFixed(1)), borderRadius: 4, backgroundColor: dl.map((x) => (x.d <= 0 ? '#34d399' : '#fb7185')) }] }, options: { plugins: { legend: { display: false }, tooltip: { callbacks: { title: (i) => dmyLong(dl[i[0].dataIndex].f.date) + ' · ' + vName(dl[i[0].dataIndex].f), label: (i) => `${num(i.parsed.y, 1)} ct/L vs markt` } } }, scales: { x: { grid: { display: false } } } } });
    const tr = S.vehicles.filter((v) => v.trackConsumption !== false), cf = F.filter((f) => f.consumption != null && tr.some((v) => v.id === f.vehicleId)), dates = [...new Set(cf.map((f) => f.date))].sort();
    if ($('#sCons')) mk('sCons', { type: 'line', data: { labels: dates.map(dmy), datasets: tr.map((v) => ({ label: v.name, borderColor: v.color, backgroundColor: v.color, pointRadius: 3, borderWidth: 2, tension: .3, spanGaps: true, data: dates.map((d) => cf.find((f) => f.vehicleId === v.id && f.date === d)?.consumption ?? null) })) }, options: { plugins: { legend: { position: 'bottom' } }, scales: { x: { ticks: { maxTicksLimit: 8 }, grid: { display: false } } } } });
    const cut = iso(addDays(now, -365)), per = S.vehicles.map((v) => ({ v, t: sum(F.filter((f) => f.vehicleId === v.id && f.date >= cut), 'total') }));
    mk('sVeh', { type: 'doughnut', data: { labels: per.map((x) => x.v.name), datasets: [{ data: per.map((x) => r2(x.t)), backgroundColor: per.map((x) => x.v.color), borderColor: '#0d0d1a', borderWidth: 3 }] }, options: { cutout: '68%', plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: (i) => `${i.label}: ${eur(i.parsed)}` } } } } });
  },
};

let pf = { fuel: 'euro95', q: '' };
V.prijzen = {
  title: 'Prijzen',
  html() {
    const main = station(MAIN), n = S.stations.filter((s) => s.last?.p).length;
    return `<div class="card"><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;margin-bottom:14px">
      <div class="chips" id="pfuel">${PUMP_FUELS.map((k) => `<button class="chip ${pf.fuel === k ? 'on' : ''}" data-v="${k}" style="--c:${fuelColor(k)}">${fuelLabel(k)}</button>`).join('')}</div>
      <input type="search" id="pq" placeholder="Zoek station of plaats…" value="${esc(pf.q)}" style="max-width:260px"></div>
      <div class="muted small" style="margin:0 4px 8px">${n} DATS 24-stations · bijgewerkt ${ago(S.meta?.lastRun)} · tik op een station voor de prijshistoriek</div><div id="plist"></div></div>`;
  },
  after() {
    const list = () => {
      const main = station(MAIN), ref = main?.last?.p?.[pf.fuel], q = pf.q.trim().toLowerCase();
      const rows = S.stations.filter((s) => s.last?.p?.[pf.fuel] != null && (!q || (s.name + ' ' + (s.address || '')).toLowerCase().includes(q))).map((s) => ({ s, p: s.last.p[pf.fuel], d: km(main, s) })).sort((a, b) => a.p - b.p);
      rows.forEach((r, i) => (r.rk = i + 1)); const mi = rows.findIndex((r) => r.s.id === MAIN); if (mi > 0) rows.unshift(...rows.splice(mi, 1)); // Izegem pinned on top
      $('#plist').innerHTML = rows.map((r) => `<div class="prow ${r.s.id === MAIN ? 'main' : ''} ${r.rk === 1 ? 'first' : ''}" data-id="${r.s.id}"><div class="rk">${r.rk}</div>
        <div><b>${esc(short(r.s.name) || r.s.name)}</b>${r.s.id === MAIN ? ' <span class="pill" style="--c:#8b5cf6">Hoofdstation</span>' : ''}<div class="muted small">${esc(r.s.address || '')}</div></div>
        <div class="df">${ref != null && r.s.id !== MAIN ? (r.p - ref >= 0 ? '+' : '−') + num(Math.abs(r.p - ref) * 100, 1) + ' ct' : ''}</div><div class="ds">${r.d != null && r.s.id !== MAIN ? num(r.d, 0) + ' km' : ''}</div><div class="pr" style="color:${fuelColor(pf.fuel)}">${ppl(r.p)}</div></div>`).join('') || empty('Nog geen stationprijzen — de scraper heeft nog niet gedraaid.');
      $$('.prow').forEach((el) => (el.onclick = () => stationModal(el.dataset.id)));
    };
    list();
    $$('#pfuel .chip').forEach((c) => (c.onclick = () => { pf.fuel = c.dataset.v; $$('#pfuel .chip').forEach((x) => x.classList.toggle('on', x === c)); list(); }));
    $('#pq').oninput = debounce((e) => { pf.q = e.target.value; list(); }, 120);
  },
};
async function stationModal(id) {
  const s = station(id); if (!s) return;
  openModal(`<h2>${esc(s.name)} <button class="iconbtn" id="mx">${svg('x')}</button></h2><div class="muted small" style="margin:-8px 0 14px">${esc(s.address || '')} ${s.lat ? `· <a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}">Open in Maps</a>` : ''}</div>
    <div class="grid4" style="margin-bottom:8px">${PUMP_FUELS.filter((k) => s.last?.p?.[k] != null).map((k) => `<div class="card kpi" style="padding:12px 14px"><span style="color:${fuelColor(k)}">${fuelLabel(k)}</span><b>${ppl(s.last.p[k])}</b></div>`).join('')}</div>
    <div class="chart sm"><canvas id="mChart"></canvas></div>`, async (box) => {
    $('#mx', box).onclick = closeModal;
    const ds = id === MAIN ? S.days.slice(-120) : await stationDays(id, 120), ctx = $('#mChart')?.getContext('2d'); if (!ctx) return;
    mk('mChart', { type: 'line', data: { labels: ds.map((d) => dmy(d.date)), datasets: ['euro95', 'euro98', 'diesel'].filter((k) => ds.some((d) => d.p?.[k] != null)).map((k) => ({ label: fuelLabel(k), data: ds.map((d) => d.p?.[k] ?? null), borderColor: fuelColor(k), pointRadius: ds.length < 4 ? 4 : 0, borderWidth: 2, tension: .3, spanGaps: true })) }, options: { interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom' } }, scales: { x: { ticks: { maxTicksLimit: 6 }, grid: { display: false } } } } });
  });
}

V.instellingen = {
  title: 'Instellingen',
  keepOnData: true,
  html() {
    const vrow = (v) => `<div class="vrow" data-id="${v.id}"><input name="name" value="${esc(v.name)}" placeholder="Naam"><input name="plate" value="${esc(v.plate || '')}" placeholder="Nummerplaat">
      <select name="fuel">${PUMP_FUELS.map((k) => `<option value="${k}" ${v.fuel === k ? 'selected' : ''}>${fuelLabel(k)}</option>`).join('')}</select>
      <label class="switch"><input type="checkbox" name="trackConsumption" ${v.trackConsumption !== false ? 'checked' : ''}><span></span>L/100 km</label><input type="color" name="color" value="${v.color || '#8b5cf6'}"></div>`;
    return `<div class="grid2"><div class="card"><h3>Voertuigen</h3>${S.vehicles.map(vrow).join('')}
      <form id="newV" style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap"><input name="name" placeholder="Nieuw voertuig…" style="flex:1;min-width:140px"><input name="plate" placeholder="Nummerplaat" style="flex:1;min-width:120px"><button class="btn grad" type="submit">Toevoegen</button></form>
      <p class="muted small">Zet <b>L/100 km</b> uit voor voertuigen waarvan je het verbruik niet wil bijhouden: het veld verdwijnt dan bij het tanken.</p></div>
    <div class="card"><h3>Gegevens & account</h3>
      <p class="muted">Ingelogd als <b style="color:var(--text)">${esc(S.user?.email || '')}</b></p>
      <p class="muted small">${S.fills.length} tankbeurten · ${S.days.length} prijsdagen Izegem · ${S.stations.length} stations<br>Prijzen laatst bijgewerkt: ${ago(S.meta?.lastRun)} (${S.meta?.stationCount ?? '?'} stations)</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" id="exp">${svg('down')} Back-up (JSON)</button><button class="btn danger" id="out">Uitloggen</button></div>
      <p class="muted small" style="margin-top:16px">Verwijderen is veilig: tankbeurten gaan naar de prullenbak en zijn herstelbaar.</p></div></div>`;
  },
  after() {
    $$('.vrow').forEach((r) => {
      const save = debounce(async () => {
        const g = (n) => $(`[name=${n}]`, r); try { await saveVehicle(r.dataset.id, { name: g('name').value.trim() || 'Voertuig', plate: g('plate').value.trim(), fuel: g('fuel').value, trackConsumption: g('trackConsumption').checked, color: g('color').value }); toast('Opgeslagen ✓'); } catch (e) { toast(e.message, true); }
      }, 500);
      r.addEventListener('input', save); r.addEventListener('change', save);
    });
    $('#newV').onsubmit = async (e) => {
      e.preventDefault(); const f = e.target, name = f.name.value.trim(); if (!name) return;
      const pal = ['#8b5cf6', '#22d3ee', '#f472b6', '#fbbf24', '#34d399', '#60a5fa'];
      try { await saveVehicle(slug(name), { name, plate: f.plate.value.trim(), fuel: 'euro95', trackConsumption: true, color: pal[S.vehicles.length % pal.length], order: S.vehicles.length }); f.reset(); toast('Voertuig toegevoegd ✓'); } catch (err) { toast(err.message, true); }
    };
    $('#exp').onclick = () => download(`tankbuddy-backup-${iso()}.json`, exportAll());
    $('#out').onclick = () => import('./data.js').then((m) => m.logout());
  },
};
