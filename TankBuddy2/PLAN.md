# TankBuddy 2 — Plan & Handoff

> Rule #1: the old WPF app and its live data (`TankBuddy\bin\Debug\net8.0-windows\*.json`) are **never modified or deleted**.
> Backup: `Backup files\2026-10-15_pre-firebase\` (hash-verified, includes full old app zip).
> Rule #2: €0. Firebase **Spark** plan only (no Cloud Functions, no Cloud Vision, no Storage bucket needed).

## 1. Decisions (and why)

| Question | Decision | Why |
|---|---|---|
| Mobile framework | **PWA** (installable web app, vanilla JS ES modules, no build step) | Flutter not installed; PWA = 1 codebase for phone **and** PC, free hosting, no app store, camera + OCR work in-browser |
| PC version | Same PWA, opened as a standalone window (`msedge --app=…`, or Edge/Chrome "Install") | Modern UI once, not twice; old WPF stays as fallback until you approve the switch |
| Backend | Firebase **Auth** (email+password, verified) + **Firestore** (europe-west1) + **Hosting** | All free on Spark |
| Security | Firestore rules: only verified `milan.blairon@gmail.com` may read/write | Single-user data |
| OCR | **Tesseract.js** in the browser (free, offline after first load) → editable form | Cloud OCR needs Blaze (card). You only pick vehicle + L/100km |
| Price source | **carbu.com station pages** (mirror of Dats24.be, 1 request = all fuels) | The old XPath was brittle; dats24.be finder has no public API |
| Station discovery | Crawl: Izegem page → "nearby DATS24" links → BFS until no new stations | No list of stations needed upfront |
| Auto-download | Node script `tools/scrape.mjs`, Windows Task Scheduler **at logon** (+ daily fallback), skips if done <6h ago | Matches "every PC startup"; more efficient alt: optional GitHub Actions cron (PC can be off) |
| Charts | Chart.js 4 (CDN, pinned) | Light, themeable |
| Language | UI in Dutch (like the old app) | |

## 2. Data model (Firestore)

- `vehicles/{slug}`: name, plate, fuel, `trackConsumption` (bool — **feature 1**), color, order
- `fillups/{id}` (id = deterministic hash ⇒ import is idempotent): vehicleId, vehicleName, date `YYYY-MM-DD`, liters, ppl, total (=liters×ppl), fuel (`euro95|euro98|diesel|lpg|cng`), consumption (number|null), stationId|null, src (`import|manual|ocr`), createdAt
- `stations/{carbuId}`: name, address, lat, lng, brand, isMain (Izegem = `3743`), updatedAt
- `stations/{id}/days/{YYYY-MM-DD}`: `p: {euro95, euro98, diesel, lpg, cng, adblue}`, src, ts
- `meta/scrape`: lastRun, stationCount, status
- Old `prijsgeschiedenis.json` (1478 rows = DATS 24 Izegem, verified vs today's carbu price) → 493 day-docs of station 3743.
- Free-tier math: ~160 stations × 1 write/day = ~160 writes (limit 20k); history chart ≈ 500 reads (limit 50k) and cached offline; storage ≈ 15 MB/yr (limit 1 GiB).

## 3. Feature map

1. No-consumption vehicles → `trackConsumption=false` hides the L/100km field & its charts (toggle in Instellingen).
2. OCR ticket → camera/photo → grayscale+contrast+upscale → Tesseract → parse liters / €/L / total / date (cross-check liters×ppl≈total, derive missing one) → prefilled form, user picks vehicle + L/100km.
3. Stats: cost per fill-up (bar), monthly spend, spend per vehicle, avg €/L trend, **paid vs. Izegem market price that day**, consumption trend (tracked vehicles only).
4. Modern dark UI (see §4), responsive: sidebar ≥900px, bottom tab bar + FAB on phone.
5. All DATS24 stations stored daily; Izegem is pinned as main; station browser + cheapest-nearby list.
6. Auto-download at logon (see §1).
7. Backlog: odometer/km cost, CSV export, family sharing (add emails to rules), push alert when price drops, Google sign-in, GitHub Actions cron.

## 4. UI direction
Near-black (#0a0a12) background, glass cards (1px translucent border, blur), neon gradient accents violet→pink→cyan, per-fuel colors (95 green, 98 amber, diesel blue), big rounded numbers, soft glows, Space Grotesk/Inter. Could not extract exact tokens from sidefxaudio.be (JS-rendered) — matched by style.

## 5. Phases / status

- [x] P0 Backup + data analysis
- [x] P1 Firebase project `tankbuddy-milan` created (Spark)
- [x] P2 Firestore (europe-west1) + rules deployed, web app registered, service-account key stored OUTSIDE OneDrive (`%LOCALAPPDATA%\TankBuddy\serviceAccount.json`)
- [x] P3 Import done & verified: 3 vehicles, 83 fill-ups, 494 price days (idempotent; re-run `node tools/import-local.mjs --msi --commit` is safe)
- [x] P4 PWA built (Overzicht, Tanken, Historiek, Statistieken, Prijzen, Instellingen), deployed: https://tankbuddy-milan.web.app
- [x] P5 OCR built (Tesseract.js) — parser unit-tested on synthetic text only; **needs a real DATS24 ticket photo to tune**
- [x] P6 Scraper: 78 DATS24 stations stored daily; Task Scheduler `TankBuddy-Prijzen` (logon +1 min, daily 12:00, skips if <6h)
- [x] P7 Deployed; PC launcher `TankBuddy 2.lnk` (Edge app window). Old `TankBuddy.lnk`/exe untouched.
- [ ] **USER STEP A**: enable Authentication (see §6) — blocked on console, API needs billing
- [ ] P8 (user decision) retire old app — only after user confirms data parity in the new app

## 6. Handoff

**Manual steps left (only the user can do these)**
1. Firebase console → *Authentication* → **Get started** → *Sign-in method* → **Email/Password** → Enable → Save. https://console.firebase.google.com/project/tankbuddy-milan/authentication/providers
2. Open https://tankbuddy-milan.web.app → "Account maken" with `milan.blairon@gmail.com` → click the verification mail → "Ik heb bevestigd" → data appears.
3. Phone: open the URL in Chrome/Safari → menu → "Add to Home screen". PC: use `TankBuddy 2.lnk` (or Edge ⋯ → Apps → Install).

**Where things are**
- App source `public/` (no build step). Deploy: `cd TankBuddy2; firebase deploy --only hosting` (bump `C` in `public/sw.js` when you change files so installed apps refresh).
- Tools `tools/` (Node 22 + firebase-admin): `import-local.mjs`, `scrape.mjs`, `discover.mjs <from> <to>` (found all 78 DATS24 stations in carbu codes 2300–2900; re-run occasionally), `export-demo.mjs` (writes git-ignored/undeployed `public/demo.json`; open `/?demo` locally via any static server for UI work without login), `install-startup.ps1` (re-run after changing scrape.mjs).
- Scraper logs: `%LOCALAPPDATA%\TankBuddy\scraper\scrape.log`.
- Firestore rules: only verified `milan.blairon@gmail.com`; unauthenticated read verified = 403. Add family e-mails in `firestore.rules` → `firebase deploy --only firestore:rules`.

**Safety facts**
- Old live data (`TankBuddy\bin\Debug\net8.0-windows\*.json`) was never modified. Backup with hashes: `Backup files\2026-10-15_pre-firebase\`.
- App never hard-deletes: removing a fill-up = soft delete (Prullenbak, restorable). In-app backup button exports JSON.
- Old price history = DATS 24 Izegem (carbu id 3743), 2024-05-05 → 2026-10-14. Gaps (days the old app wasn't opened) exist; "paid vs market" ignores prices older than 7 days.

**Known limits / next ideas**
- OCR accuracy on real tickets unknown; send a photo → tune `parseTicket` in `public/js/ocr.js` (the form always lets you correct values; raw OCR text is shown for debugging).
- carbu.com HTML could change → scraper logs `no prices`/`fail`; selectors are `data-*`/`class="price"` based, not XPath.
- Optional: GitHub Actions cron so prices also download when the PC is off; push alerts; odometer/km cost; Google sign-in.
- `tools/node_modules` sits inside OneDrive (syncs lots of small files); harmless but could be excluded.
- Git: nothing committed yet (new folder `TankBuddy2/` + `.gitignore` entries are uncommitted).

## 7. Update 2026-10-15 (security + images)
- Rules: client is read-only for stations/meta; fillups/vehicles/tickets validated, no client deletes. Headers: strict CSP, HSTS, X-Frame-Options DENY, nosniff, no-referrer. SRI on Chart.js/Tesseract. Auth uses no popup iframe. Logout wipes offline cache.
- Ticket photo: camera or file, downscaled to 1280px JPEG, stored in Firestore `tickets/{id}` (Firebase Storage needs Blaze). Car photo: `vehicles/{id}.img` (WebP/PNG with alpha, ≤480px), set in Instellingen.
- Old WPF app stays (user decision).
