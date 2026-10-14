// Chart.js helpers (Chart is a global from the CDN script) + tiny SVG sparkline.
const reg = new Map();
export function initCharts() {
  const C = window.Chart; if (!C) return;
  C.defaults.color = '#8b8fa8'; C.defaults.font.family = 'Inter, system-ui, sans-serif'; C.defaults.font.size = 11;
  C.defaults.borderColor = 'rgba(255,255,255,.06)'; C.defaults.maintainAspectRatio = false; C.defaults.animation.duration = 500;
  Object.assign(C.defaults.plugins.tooltip, { backgroundColor: 'rgba(14,14,26,.96)', borderColor: 'rgba(255,255,255,.12)', borderWidth: 1, padding: 10, cornerRadius: 10, titleColor: '#eef0ff', bodyColor: '#c9cce6', boxPadding: 4 });
  C.defaults.plugins.legend.labels.usePointStyle = true; C.defaults.plugins.legend.labels.boxWidth = 8;
}
export function mk(id, cfg) {
  const el = document.getElementById(id); if (!el || !window.Chart) return null;
  reg.get(id)?.destroy();
  const c = new window.Chart(el, cfg); reg.set(id, c); return c;
}
export function killCharts() { reg.forEach((c) => c.destroy()); reg.clear(); }
export const gradient = (ctx, color, h = 260) => { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, color + '66'); g.addColorStop(1, color + '00'); return g; };
export function spark(vals, color, w = 120, h = 34) {
  vals = vals.filter((v) => v != null); if (vals.length < 2) return '';
  const mn = Math.min(...vals), mx = Math.max(...vals), rg = mx - mn || 1;
  const pts = vals.map((v, i) => [(i / (vals.length - 1)) * w, h - 3 - ((v - mn) / rg) * (h - 6)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  return `<svg viewBox="0 0 ${w} ${h}" class="spark" preserveAspectRatio="none"><defs><linearGradient id="sg${color.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="${d}L${w} ${h}L0 ${h}Z" fill="url(#sg${color.slice(1)})"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
