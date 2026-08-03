# Releasing AVF

## Stable API policy

The **stable public API** is exactly what [`index.mjs`](index.mjs) re-exports. Semantic versioning is
defined *against that surface*, not against internal files:

| Change to the stable API | Version bump |
|--------------------------|--------------|
| Add an export | **minor** (`0.x.0`) — additive, non-breaking |
| Add an optional argument / widen behavior, backward-compatible | **minor** |
| Change an export's signature or return shape | **major** (`x.0.0`) |
| Remove or rename an export | **major** |
| Fix a bug, no behavior change | **patch** (`0.0.x`) |
| Anything reached by a **deep path** (`avf/rules/engine.mjs`, …) | **no guarantee** — may change in any release |

The `exports` map in `package.json` enforces the boundary: an installed consumer can import `avf` (the
barrel) but not `avf/rules/engine.mjs`. Deep paths are internal by contract, not just by convention.

This is why the barrel is kept small: **adding an export later is a minor bump; removing one is a major
bump.** A reviewer can reject "just export this too" on that basis alone — promote a symbol to stable only
when a consumer genuinely needs it.

`framework_version` (in every report's `run` block) versions the **kernel contract** — the verdict object
and the benchmark/engine contracts — on the same major/minor/patch rules. A report always records which
kernel produced it, so audit survives evolution.

## Release process

The artifact a user receives is the npm tarball — so the release gate is *"does the packed tarball work in
a clean directory?"*, not *"does it work in the repo?"*.

```bash
npm test && npm run test:report && npm run test:cli && npm run test:examples   # all GREEN first

npm pack                        # → avf-<version>.tgz (inspect the file list it prints)

# In a throwaway directory with NOTHING else:
mkdir /tmp/avf-clean && cd /tmp/avf-clean
npm init -y
npm install /path/to/avf-<version>.tgz
npx avf simulate --verdict DEFER --env production   # → BLOCK, exit 1
npx avf run h5 referential@v0.3                      # → SUPPORTED

# Only once the clean-room run passes:
git tag v<version>
npm publish
```

If any command fails in the clean directory, `files`/`exports`/`bin` in `package.json` is wrong — fix the
packaging, never the clean-room test.
