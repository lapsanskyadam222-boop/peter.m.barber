# Mobilný web – logo, carousel, text (Next.js + Vercel Blob)

## Čo to je
Jednoduchý public web (logo + carousel + text) a admin rozhranie s priamym uploadom JPG do Vercel Blob. Dáta sa ukladajú do `site-content.json`.

## Požiadavky
- Node.js 18+
- GitHub účet
- Vercel účet (Blob + deploy)

## Inštalácia lokálne (5 krokov)
1. `npm i`
2. `.env.example` skopíruj na `.env.local` a doplň:
   - `ADMIN_EMAIL=pur.ka.970@gmail.com`
   - `ADMIN_PASSWORD_HASH=` → vygeneruj hash pre tvoje heslo (napr. "rajecketeplice"):

     ```bash
     node -e "require('bcrypt').hash('rajecketeplice', 12).then(console.log)"
     ```
   - `AUTH_SECRET=` → napr. `openssl rand -base64 32`
   - `BLOB_READ_WRITE_TOKEN=` → nastavíš na Verceli (lokálne môže byť prázdne)
3. Spusť vývojový server: `npm run dev`

   - Public: `http://localhost:3000/`

   - Admin:  `http://localhost:3000/admin`

4. Prihlás sa a otestuj formulár (upload JPG ≤10MB/ks, 1–10 kusov).
5. Commitni kód a pushni na GitHub.

## Deploy na Vercel (4 kroky)
1. Vercel → **New Project** → vyber GitHub repo.
2. V **Project → Settings → Environment Variables** pridaj:

   - `BLOB_READ_WRITE_TOKEN`

   - `ADMIN_EMAIL`

   - `ADMIN_PASSWORD_HASH`

   - `AUTH_SECRET`

3. Deploy.

4. Otestuj produkciu:

   - Admin: `https://<tvoja-domena>/admin` → nahraj logo + fotky + text → **Zverejniť**

   - Public: `https://<tvoja-domena>/`

## Limity a validácie
- JPG, ≤10MB/ks, 1–10 obrázkov (kontrola na klientovi aj serveri).
- JSON ukladá timestamp `updatedAt`.

- `GET /api/content` vracia poslednú verziu `site-content.json`.

## Poznámky
- Ak upload zlyhá, skontroluj `BLOB_READ_WRITE_TOKEN` na Verceli.

- Pri zmene env premenných je potrebný redeploy.

- Odporúčam nahrávať fotky max ~1600px na dlhšej strane kvôli rýchlosti.
