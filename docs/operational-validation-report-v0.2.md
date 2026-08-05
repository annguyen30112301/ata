# Operational Validation Report — v0.2 (Human Pass)

> Companion to `operational-validation-report-v0.1.md`. **v0.1 is not modified** — the two are
> different kinds of evidence: v0.1 is *machine* validation (a clean clone driven verbatim), v0.2 is
> *human* validation (an independent first-time user given only the Quickstart). Both are kept.

## Method

- A first-time user (never seen AVF) was given **only** `docs/quickstart.md` and a way to obtain the repo.
- The observer stayed **silent**: no explaining, no hints, no fixing. Every question was recorded, not answered.
- Executed on **multiple machines**.
- Date: 2026-08-05.

## Result (summary)

- **The documented path executed successfully on every machine tested.** Zero blocking failures.
- Exactly **one** question surfaced during the whole pass — a comprehension question, not an execution one.

## Findings

### H-1 — Step 5 command is not paste-safe across shells · kind: documentation portability
```
Step          Quickstart §5 — `avf review --dry-run` (the only multi-line example, joined with "\")
Expected      paste into a terminal and it runs
Actual        "\" is a POSIX-shell line continuation; pasted into Windows cmd / PowerShell it errors
              unless collapsed onto a single line
Severity      self-recovered (user collapsed it to one line) — did NOT block
Root cause    the ```bash block assumes bash; every other step is single-line and unaffected
Fix proposal  make §5 a single line — runs on bash + cmd + PowerShell, no per-shell variants
```

### H-2 — "What is this? I could follow it but didn't understand anything." · kind: comprehension pressure
```
Step          the whole Quickstart
Question      "cái này là gì?" / "what is this?" — followed every step, grasped the concept = 0
Expected      per the Quickstart's own stated goal: "see the pipeline run" — NOT "understand it"
              (concepts deliberately live in the README)
Actual        ran everything to completion; no conceptual understanding
Severity      did NOT block execution
Note          this is a signal for a LATER layer (product comprehension), not an R1 defect —
              understanding was never in R1's acceptance criterion
```

### Status

| Finding | Kind                      | Status          |
| ------- | ------------------------- | --------------- |
| H-1     | documentation portability | admitted → R1.2 |
| H-2     | comprehension pressure    | observed (n=1)  |

## Passed without a question

Every documented step — clone, `npm ci`, `npm test` (full suite), `avf simulate / run / report / dashboard`
— completed with no help on every machine tested. The single question was about *meaning*, never about *how to run*.

## Verdict

> **R1 confirmed by both machine validation and one independent human execution.**

Against the canonical acceptance (*clone → install → run the validation suite → produce one artifact,
from the docs alone, with no outside help*): **PASS.** The one question did not break that — it was a
comprehension question, outside R1's scope.

## What this round established

Human validation confirmed, with real evidence rather than assumption, a boundary that was previously only
a hypothesis:

- **Operational Validation** — *can a stranger execute it?* → **yes** (this report).
- **Product Comprehension** — *can a stranger understand it?* → **open** (H-2, n=1).

The Quickstart did exactly its job: it **proves AVF runs**; it does **not teach** AVF. A user saying *"I did
it but don't understand it yet"* is not a failure — it is the two problems separating cleanly along the line
the design intended. Which of those two problems to invest in next is now an *evidence* question, not a guess.

## Follow-up

- **H-1 → R1.2** (Documentation Fidelity): collapse §5 to one line. Same family as R1.1 F-1..F-4 — makes the
  docs executable on more shells; not onboarding, not UX, not product. One commit.
- **H-2 → pressure register** (`docs/pressure-register.md`): recorded as comprehension pressure #1, **not
  admitted**. Per ADR-0006, a single instance is an observation, not a mandate. Admit only on recurrence
  across independent contexts.
