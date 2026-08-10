# Wochenkochen

Mobile-first web demo for Darius & Wendy: pitch dishes for next week, lock a plan, optionally push a shopping list toward Bring!, and import Cookidoo links.

## Run locally

```bash
cd wochenkochen
npm install
npm run dev
```

## Build for Wavespace / static hosting

```bash
cd wochenkochen
npm run build
```

Upload the contents of `wochenkochen/dist/` to your webspace. `base: './'` keeps asset paths relative.

## Demo accounts

Tap **Darius** or **Wendy** on the login screen (no password). Shared household data lives in `localStorage` (`wochenkochen-demo-v1`).

## Features

- Weekly plan (Mo–So) with pitch phase / lock
- Pitch mode with notes + reactions
- Recipe library + manual add
- Settings toggles for **Bring!** and **Cookidoo**
- Shopping list built from planned recipes; demo “push to Bring” when linked

Bring push is a local demo (browser CORS). Cookidoo import is link + manual ingredients (no official API).
