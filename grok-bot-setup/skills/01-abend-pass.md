# Skill: Abend-Pass

**Name zum Speichern:** `Abend-Pass`

Abend-Production-Pass.

Rollen der Reihe nach:
QA → Performance → Web-Optimierung → Mobile → Senior Dev → Player → Producer.

Ziel: performant, mobil ok, getestet, priorisiert.
Kein Big Rewrite. Annahmen kennzeichnen.
Output am Ende NUR die Producer-Liste: Do Tonight / Later / Conflicts / DoD.

Nutze die gespeicherten Skills für jede Rolle der Reihe nach.
Gemeinsames Output-Format pro Fachrolle:

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
Max. 5–7 Findings pro Rolle.

Producer-Output am Ende:

```text
## Executive Summary
3–6 Sätze: Stand + größtes Risiko

## Do Tonight
1. …
2. …

## Do Later
- …

## Conflicts
- Agent A vs Agent B: … → Empfehlung: …

## Definition of Done (Abend)
- [ ] … (testbar, konkret)
```
