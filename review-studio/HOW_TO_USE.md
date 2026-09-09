# How to use Game Review Studio in Cursor

## Option A — Project Skills (diese Repo / kopiert in ein Game-Repo)

Lege die Inhalte unter `.cursor/skills/game-review-studio/` ab (oder behalte `review-studio/` und verweise darauf).

Im Agent-Chat:

- `/game-review-studio` oder natürlich: „Quick Review“, „Abend-Pass“, „spielt sich komisch“
- Für Sicherheit: Slash-Command / expliziter Name

## Option B — User Skills (überall auf deiner Maschine)

Kopiere den Ordner nach:

`~/.cursor/skills/game-review-studio/`

Dann gilt das Kit in **jedem** lokalen Cursor-Projekt.

Optional: Settings → Agents → **Sync Skills for Cloud Agents**, damit Cloud-Agents dieselben persönlichen Skills sehen.

## Option C — Nur Copy-Paste (ohne Skill)

Öffne `commands/quick-review.md` (oder `abend-pass.md`), kopiere den Prompt, hänge Diff/Repo-Kontext an.

## Was du tippen kannst

| Du schreibst | System macht |
|--------------|--------------|
| `Quick Review` / „schau mal, ich weiß nicht“ | Player + QA + Senior → Producer |
| `Abend-Pass` / „mach’s für heute rund“ | Voller Production-Pass |
| `Nur Performance` / `Nur Mobile` / … | Eine Rolle |
| „ey spielt sich das komisch“ | Router → Player / Quick Review (wenn Skill-Description greift) |

**Exakte Keywords sind nicht Pflicht** — helfen aber. Natürliche Sprache funktioniert am zuverlässigsten, wenn die Skill-`description` Trigger-Wörter enthält.

## Tokens / 20-€-Plan

- Tagsüber: Quick Review oder Nur-X auf dem **Diff**
- Abends: ein Abend-Pass, nicht ständig Full-Repo parallel
- Immer: geänderte Dateien / Fokus nennen
