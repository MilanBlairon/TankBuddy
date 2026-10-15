// Predeploy: stamps a content hash into sw.js (so every deploy changes it => installed apps auto-update) and public/js/version.js.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
const pub = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const skip = new Set(['sw.js', 'version.js', 'demo.json']);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : skip.has(e.name) ? [] : [path.join(d, e.name)]));
const h = crypto.createHash('sha1');
for (const f of walk(pub).sort()) h.update(path.relative(pub, f)).update(fs.readFileSync(f));
const id = h.digest('hex').slice(0, 8);
const swp = path.join(pub, 'sw.js'), vp = path.join(pub, 'js', 'version.js');
const sw = fs.readFileSync(swp, 'utf8'), nsw = sw.replace(/const C = '[^']*'/, `const C = 'tb-${id}'`);
const old = fs.existsSync(vp) ? fs.readFileSync(vp, 'utf8') : '';
if (nsw !== sw) fs.writeFileSync(swp, nsw);
if (!old.includes(`'${id}'`)) fs.writeFileSync(vp, `export const VERSION = '${id}', BUILT = '${new Date().toISOString().slice(0, 16).replace('T', ' ')}';\n`);
console.log('stamped', id);
