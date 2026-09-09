# Grok Bot Setup — Game Review Studio

Dieses Pack bereitet **einen** Cursor Grok Bot vor: **Game Review Studio**.

## Wichtig: Wir können den Bot nicht remote anlegen

Cloud Agents / APIs können **keine** Grok Bots für dich erstellen. Du legst den Bot selbst in der **Grok Bot App** an und fügst die Texte aus diesem Ordner per Copy-Paste ein.

## Geräte & Account

| Frage | Antwort |
|-------|---------|
| Aufrufbar von Geräten mit Grok Bot App? | **Ja** — Mac, Windows, iOS, Android |
| Linux Desktop-App? | **Nein** (kein Linux-Desktop-Client für Grok Bot) |
| Gleicher Cursor-Account? | **Ja** — dieselben Bots auf allen verbundenen Geräten |
| Quota | Extra **wöchentliches Grok-Bot-Kontingent** (getrennt vom normalen Agent-Quota) |

## Schritte: Einen Bot anlegen

1. Grok Bot App öffnen (eingeloggt mit deinem Cursor-Account).
2. Neuen Bot erstellen.
3. Name: **Game Review Studio**
4. Beschreibung / System-Prompt: Inhalt aus `BOT_PROFILE.md` einfügen und speichern.
5. Skills installieren: nacheinander die Nachrichten aus `SETUP_CHAT.md` in den Chat des neuen Bots pasten (Bot speichert sie als Skills).
6. Fertig — Bot ist von allen Geräten mit derselben Cursor-Anmeldung nutzbar.

## Skills speichern (über den Chat)

In der Grok Bot App kannst du dem Bot sagen, einen Text als Skill zu speichern, z. B.:

> Speichere das Folgende als Skill mit dem Namen „Quick Review“:

Danach den kompletten Inhalt der jeweiligen Datei unter `skills/` einfügen.

Die Reihenfolge und die exakten Paste-Nachrichten stehen in `SETUP_CHAT.md`.

## Nutzung

| Du schreibst | Was passiert |
|--------------|--------------|
| **Quick Review** | Player + QA + Senior Dev → Producer fasst zusammen |
| **Abend-Pass** | Voller Pass: QA → Performance → Web → Mobile → Senior → Player → Producer |
| **Nur [Rolle]** | Eine Rolle streng: z. B. `Nur Performance`, `Nur Mobile`, `Nur Player` |
| Natürliche Sprache | Bot routed selbst („spielt sich komisch“, „für heute rund“, …) |

Zu Beginn eines Reviews: Repo, Diff, Fokus-Dateien oder Kontext nennen (oder anhängen).

## Dateien in diesem Ordner

- `BOT_PROFILE.md` — Paste für Bot-Beschreibung
- `SETUP_CHAT.md` — Erste Nachrichten in Reihenfolge
- `skills/` — Ein Skill pro Datei (Befehle + Rollen)
