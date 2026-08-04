# Changelog

## v0.2.0 — 2026-08-04

**Analytics is now a standalone subsystem.** Evidence Analytics is no longer the dashboard's private
computation — it is a read-only projection with its own DTO (`AnalyticsSnapshot`) and multiple independent
consumers. Every consumer depends only on the snapshot; none re-reads raw evidence. See
[ADR 0001](docs/adr/0001-analytics-snapshot-contract.md).

### Added

- **Standalone Analytics artifacts** (`analytics.json`, `analytics.html`) — Analytics can now be consumed
  independently of the dashboard: a serialized snapshot for any tool, and a self-contained explorer page.
- **Run Log** — a machine-history evidence source written by `run()`, alongside `reports/` (latest state) and
  `reviews.json` (human history).
- **TrendMetrics** — the direction of implementation behavior over time (verdict trajectory,
  confidence-quality, stability), surfaced as `AnalyticsSnapshot.trend`.
- **Dashboard Trend card** — direction, a card distinct from the latest-state Analytics Summary.

## v0.1.0 — 2026-08-03

Initial public release.

### Added

- Stable public API (`index.mjs`)
- AVF CLI
- Rule Engine (`Ruling`)
- Oracle Runtime
- Dashboard
- Offline examples
- Quickstart
- Architecture guide
- Release process

### Release validation

- Clone Test
- Clean-room `npm pack` validation
- `exports` boundary enforced
