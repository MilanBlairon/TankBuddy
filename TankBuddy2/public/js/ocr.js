// Fuel-ticket OCR: Tesseract.js (lazy-loaded, runs fully in the browser, free). parseTicket() is pure => unit-testable in Node.
const TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

function loadScript(src) {
  return new Promise((ok, no) => { if (window.Tesseract) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('OCR-bibliotheek kon niet laden (internet nodig bij 1e gebruik)')); document.head.appendChild(s); });
}

// grayscale + contrast stretch + upscale small photos => much better thermal-paper recognition
async function preprocess(file) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(2, Math.max(1, 1600 / bmp.width));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bmp, 0, 0, c.width, c.height);
  const im = g.getImageData(0, 0, c.width, c.height), d = im.data; let lo = 255, hi = 0;
  for (let i = 0; i < d.length; i += 4) { const y = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) | 0; d[i] = y; if (y < lo) lo = y; if (y > hi) hi = y; }
  const k = 255 / Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) { const y = Math.max(0, Math.min(255, (d[i] - lo) * k)); d[i] = d[i + 1] = d[i + 2] = y; }
  g.putImageData(im, 0, 0);
  return c;
}

export async function scanTicket(file, onProgress = () => {}) {
  await loadScript(TESS);
  const canvas = await preprocess(file);
  const { data } = await window.Tesseract.recognize(canvas, 'eng', { logger: (m) => m.status === 'recognizing text' && onProgress(m.progress) });
  return { text: data.text, ...parseTicket(data.text) };
}

const toN = (s) => parseFloat(s.replace(',', '.'));
export function parseTicket(text, stations = []) {
  const t = text.replace(/[Oo](?=\d)|(?<=\d)[Oo]/g, '0');
  const out = { liters: null, ppl: null, total: null, date: null, fuel: null, stationId: null, confidence: 0 };
  // numbers with 2-3 decimals
  const nums = [...new Set([...t.matchAll(/\d{1,4}[.,]\d{2,3}(?!\d)/g)].map((m) => toN(m[0])))].filter((n) => n > 0);
  // find triple liters x ppl ~= total (the strongest signal, independent of labels)
  let best = null;
  for (const l of nums) if (l >= 3 && l <= 150) for (const p of nums) if (p >= 0.9 && p <= 3.6 && p !== l) for (const tt of nums) {
    if (tt < 5 || tt > 450 || tt === l || tt === p) continue;
    const err = Math.abs(l * p - tt);
    if (err <= Math.max(0.03, tt * 0.004) && (!best || err < best.err)) best = { l, p, tt, err };
  }
  if (best) { out.liters = best.l; out.ppl = best.p; out.total = best.tt; out.confidence = 1; }
  else { // fallback: label based
    const line = (re) => { const m = t.split(/\n/).find((x) => re.test(x)); const n = m && m.match(/\d{1,4}[.,]\d{2,3}/g); return n ? toN(n[n.length - 1]) : null; };
    out.liters = line(/liter|volume|hoeveelheid|aantal|qty/i); out.ppl = line(/prijs.*l|\/\s*l|price/i); out.total = line(/totaal|total|bedrag|betalen|amount/i);
    if (out.liters && out.ppl && !out.total) out.total = Math.round(out.liters * out.ppl * 100) / 100;
    if (out.total && out.ppl && !out.liters) out.liters = Math.round((out.total / out.ppl) * 100) / 100;
    if (out.total && out.liters && !out.ppl) out.ppl = Math.round((out.total / out.liters) * 1000) / 1000;
    out.confidence = out.liters && out.ppl ? 0.5 : 0;
  }
  const d = t.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2}|\d{2})\b/);
  if (d) { const y = d[3].length === 2 ? '20' + d[3] : d[3]; const dd = d[1].padStart(2, '0'), mm = d[2].padStart(2, '0'); if (+mm >= 1 && +mm <= 12 && +dd >= 1 && +dd <= 31) out.date = `${y}-${mm}-${dd}`; }
  const lt = t.toLowerCase();
  out.fuel = /diesel|gasoil|b7/.test(lt) ? 'diesel' : /\b98\b|98\s*\(?e/.test(lt) ? 'euro98' : /\b95\b|e10|95\s*\(?e/.test(lt) ? 'euro95' : /lpg/.test(lt) ? 'lpg' : /cng/.test(lt) ? 'cng' : null;
  const s = stations.find((x) => x.city && lt.includes(x.city.toLowerCase()));
  if (s) out.stationId = s.id;
  return out;
}
