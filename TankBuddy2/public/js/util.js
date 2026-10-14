export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (d) => new Intl.NumberFormat('nl-BE', { minimumFractionDigits: d, maximumFractionDigits: d });
export const num = (n, d = 2) => (n == null || isNaN(n) ? '–' : nf(d).format(n));
export const eur = (n, d = 2) => (n == null || isNaN(n) ? '–' : '€ ' + nf(d).format(n));
export const ppl = (n) => (n == null || isNaN(n) ? '–' : nf(3).format(n));
export const iso = (d = new Date()) => d.toLocaleDateString('sv-SE');
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const dmy = (s) => (s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(2, 4) : '');
export const dmyLong = (s) => (s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '');
export const parseNum = (v) => parseFloat(String(v ?? '').replace(',', '.'));
export const sum = (a, k) => a.reduce((t, x) => t + (+x[k] || 0), 0);
export const r2 = (n) => Math.round(n * 100) / 100;
export const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
export const monthLabel = (ym) => MONTHS[+ym.slice(5, 7) - 1] + " '" + ym.slice(2, 4);

export const FUELS = {
  euro95: { label: 'Euro 95', color: '#a3e635' },
  euro98: { label: 'Euro 98', color: '#fbbf24' },
  diesel: { label: 'Diesel', color: '#60a5fa' },
  lpg: { label: 'LPG', color: '#f472b6' },
  cng: { label: 'CNG', color: '#2dd4bf' },
  adblue: { label: 'AdBlue', color: '#a78bfa' },
};
export const PUMP_FUELS = ['euro95', 'euro98', 'diesel', 'lpg', 'cng'];
export const fuelLabel = (k) => FUELS[k]?.label || k;
export const fuelColor = (k) => FUELS[k]?.color || '#8b8fa8';

export function km(a, b) { // haversine, km
  if (a?.lat == null || b?.lat == null) return null;
  const R = 6371, t = Math.PI / 180, dLat = (b.lat - a.lat) * t, dLng = (b.lng - a.lng) * t;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
export const debounce = (f, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };

export function toast(msg, bad = false) {
  const t = $('#toast'); t.textContent = msg; t.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.className = ''), 3200);
}
export function ago(ts) {
  if (!ts) return 'nooit';
  const d = ts.toDate ? ts.toDate() : new Date(ts), m = Math.round((Date.now() - d) / 60000);
  return m < 2 ? 'zonet' : m < 90 ? `${m} min geleden` : m < 2880 ? `${Math.round(m / 60)} u geleden` : `${Math.round(m / 1440)} d geleden`;
}
export function download(name, text, type = 'application/json') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
