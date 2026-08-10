# Wochenkochen

Mobile-first web demo for Darius & Wendy: pitch dishes for next week, lock a plan, optionally push a shopping list toward Bring!, and import Cookidoo links.

## Upload to your website (no build needed)

Upload **everything inside** the `www/` folder to your webspace (FTP / Wavespace / file manager):

- `index.html`
- `favicon.svg`
- `assets/`

Do **not** upload a `dist` folder — the finished site is already in `www/`.

After upload, open the URL where you placed `index.html`.

## Demo accounts

Tap **Darius** or **Wendy** on the login screen (no password). Shared household data lives in `localStorage` (`wochenkochen-demo-v1`).

## Features

- Weekly plan (Mo–So) with pitch phase / lock
- Pitch mode with notes + reactions
- Recipe library + manual add
- Settings toggles for **Bring!** and **Cookidoo**
- Shopping list built from planned recipes; demo “push to Bring” when linked

Bring push is a local demo (browser CORS). Cookidoo import is link + manual ingredients (no official API).

## Develop locally (optional)

```bash
cd wochenkochen
npm install
npm run dev
```

To refresh the uploadable site after code changes:

```bash
npm run build   # writes to www/
```
