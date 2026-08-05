# Pressure Register

> Evidence accumulator for ADR-0006. **No one implements from this file.** It only records pressure
> observed from real use. A pressure is *admitted* (and only then may earn a feature, a doc change, or an
> ADR) when it **recurs across independent contexts** — never on a single instance. One occurrence is an
> *observation*, not a mandate.
>
> Kinds seen so far: `runtime` · `developer` · `documentation` · `comprehension`. Recording a kind here does
> not rank it; recurrence does.

## Convention — append-only

Like the run-log and the review-log, this register is **append-first**:

- Append only; never edit or delete a past record.
- Never bump a past record's `Frequency` in place — a new occurrence is a **new** record (`#2`, `#3`, …)
  whose `Frequency` states the running count at that point. `#1` keeps `Frequency: 1` forever.
- Never flip a past `Admitted: No` to `Yes`. Admission is a **separate, new** record that cites the
  evidence it rests on:
  ```
  Admission
  Pressure:  <kind>
  Evidence:  #1, #2, #3
  Decision:  Admitted
  Date:      <date>
  ```

History accumulates; it is never rewritten.

---

## Comprehension pressure

```
#1
Source:     Human Operational Validation #1 (see operational-validation-report-v0.2.md)
Date:       2026-08-05
Question:   "Cái này là gì?" / "What is this?" — user could follow the Quickstart end-to-end but did
            not understand what AVF is or what they had done.
Frequency:  1
Admitted:   No   (n=1 — observation only)
```

<!-- Add #2, #3, … as they occur. Admit only when the same pressure recurs across independent users/contexts.
     Example admission bar: same comprehension gap from 3+ independent first-time users. -->
