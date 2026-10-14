// Where the Firebase service-account key lives: OUTSIDE OneDrive (so it never syncs to the cloud).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const candidates = [process.env.TB_KEY, path.join(process.env.LOCALAPPDATA || '', 'TankBuddy', 'serviceAccount.json'), path.join(here, '..', '.secrets', 'serviceAccount.json')].filter(Boolean);
export const keyFile = candidates.find((f) => fs.existsSync(f));
if (!keyFile) throw new Error('serviceAccount.json not found. Put it in %LOCALAPPDATA%\\TankBuddy\\ (see PLAN.md).');
export const serviceAccount = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
