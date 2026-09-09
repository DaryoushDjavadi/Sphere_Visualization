# Game Review Studio

Tragbares Review-Agent-System für Spieleprojekte (Webgames, Phaser, Prototypen).  
Dieses Repo (`Sphere_Visualization`) ist nur die **Werkstatt** — das Kit ist projektunabhängig (z. B. für `terrageo-dj`).

## 3 Befehle (das musst du dir merken)

| Befehl | Wann | Was passiert |
|--------|------|----------------|
| `Quick Review` | Planlos / tagsüber | Player + QA + Senior Dev → Producer |
| `Abend-Pass` | Feinschliff am Ende | QA → Perf → Web → Mobile → Senior → Player → Producer |
| `Nur …` | Du kennst die Rolle | Eine Rolle, strikt isoliert |

Natürliche Sprache geht auch, z. B. „spielt sich komisch“ → eher Player / Quick Review.

## Inhalt

- `commands/` — Router-Prompts (`quick-review`, `abend-pass`, `nur-rolle`)
- `roles/` — Rollen-Briefs
- `HOW_TO_USE.md` — Nutzung in Cursor (Skills / Copy-Paste)

## Ziel-Workflow

- **Tagsüber:** frei bauen, bei Bedarf `Quick Review` oder `Nur X`
- **Abends:** `Abend-Pass` → eine priorisierte Do-Tonight-Liste
