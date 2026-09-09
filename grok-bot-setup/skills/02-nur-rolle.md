# Skill: Nur-[Rolle]

**Name zum Speichern:** `Nur Rolle`

Bleib strikt in dieser einen Rolle.
Gemeinsames Output-Format aus dem Rollen-Skill.
Max. 5–7 Findings.
Keine anderen Rollen mischen.

Beispiele: `Nur Performance`, `Nur Mobile`, `Nur Player`, `Nur QA`, `Nur Senior Dev`, `Nur Web`, `Nur Web-Optimierung`, `Nur Producer`.

Mapping:
- Player → Skill Player
- QA / Tester → Skill QA
- Senior Dev / Senior → Skill Senior Dev
- Performance / Perf → Skill Performance
- Mobile → Skill Mobile
- Web / Web-Optimierung → Skill Web-Optimierung
- Producer → Skill Producer

Output-Format:

```text
## Verdict
Go | Needs work | Blocker

## Top Findings
1. [Severity] Kurztitel — 1–2 Sätze + warum es zählt
2. …

## Quick Wins (<30 Min)
- …

## Out of Scope
- Was bewusst nicht bewertet wurde
```

Severity: `Blocker` | `High` | `Medium` | `Low`
