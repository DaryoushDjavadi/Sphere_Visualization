# Wochenkochen

Mobile-first web demo for Darius & Wendy: pitch dishes for next week, lock a plan, send shopping lists to **Bring!** with a real login, and import **Cookidoo** recipes after linking your account.

## Upload to your website (no build needed)

Upload **everything inside** the `www/` folder to your webspace (FTP / Wavespace / file manager):

- `index.html`
- `favicon.svg`
- `assets/`
- `api/bring.php`
- `api/cookidoo.php`

Your host must support **PHP + curl** (typical shared webspace). That is what makes Bring/Cookidoo logins work (browser cannot call those APIs directly because of CORS).

## App login

Tap **Darius** or **Wendy** — household data in `localStorage`.

Top-left **Menü**: Einstellungen · Hilfe · Abmelden.

Bottom nav: Plan · Pitch · Rezepte — **Bring** only appears when enabled in Settings.

## Integrations

Bring! and Cookidoo are **optional** (off by default).

### Bring!
1. Menü → Einstellungen → toggle Bring on  
2. Enter Bring e-mail + password → **Bring-Konto verknüpfen**  
3. Pick the shopping list  
4. Plan meals → Bring tab → **An Bring senden**

### Cookidoo
1. Menü → Einstellungen → toggle Cookidoo on  
2. Enter Cookidoo e-mail + password + country → **Cookidoo-Konto verknüpfen**  
3. Rezepte → **Cookidoo import** → paste link or id → **Vom Konto laden**  
4. Or fill title/ingredients manually if auto-import fails  

Cookidoo’s password grant is being phased out by Vorwerk; if login fails, use manual import and check the error text in Settings.

## Develop locally (optional)

```bash
cd wochenkochen
npm install
npm run dev
```

PHP APIs need a PHP-capable host (or `php -S` pointed at `www/` after build). Refresh uploadable files:

```bash
npm run build   # writes to www/
```
