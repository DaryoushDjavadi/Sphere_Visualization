# Hofdorf

Multiplayer-Farmspiel im Stil von Stardew Valley: **jeder Spieler hat einen eigenen Hof**, die **Stadt und die Wege dazwischen sind geteilt und synchron**. Du kannst dich auf dem Dorfplatz treffen und zum Hof der anderen laufen.

## Starten

```bash
cd hofdorf
npm install
npm start
```

Browser: [http://localhost:3847](http://localhost:3847)

Handy im gleichen Netz: `http://<deine-ip>:3847` — Touch-Stick links, Aktion rechts. Mehrere Handys/Tabs = mehrere Spieler auf demselben Server.

## Steuerung

| Eingabe | Aktion |
|---------|--------|
| WASD / Pfeile / Stick | Laufen |
| Leertaste / E / A-Button | Werkzeug / Samen nutzen |
| 1–8 / Hotbar tippen | Slot wählen |
| B / Laden | Dorfladen |
| Z / Schlaf | Schlafen → neuer Tag |

## Spielidee

- Beim Beitritt bekommst du einen der vier Höfe (Nord/Süd/West/Ost).
- Auf dem eigenen Hof: hacken, säen, gießen, ernten, Bäume fällen, Steine abbauen.
- Fremde Höfe darfst du betreten und anschauen — bebauen nur den eigenen.
- Im Dorf: Laden (Samen kaufen, Ernte verkaufen), Brunnen, Wege zu allen Höfen.
- Gemeinsame Uhr: Tag/Nacht, Wetter, Jahreszeiten. Schlafen bringt den nächsten Morgen für alle.

## Stack

- Node.js + Express + WebSocket (autoritativer Server)
- Canvas-2D-Client, mobiltauglich, ohne Build-Step

Eigenes Repo später: Ordner `hofdorf/` ist bereits eigenständig (`npm start` reicht).
