# VM0010 v1.4 — Submission Evidence (issue #5941)

**Bounty:** hashgraph/guardian#5941 · **Repository:** guardian, branch `develop`, HEAD `089c11698`
**Slice dir:** `Methodology Library/DLT Earth Methodology Bounty Program/VM0010 V1.4`
**Outcome:** BLOCKED for final submission (all safe offline work complete; gaps require external resolution)

## Reproducible test results

Command (from the VM0010 V1.4 folder, zero dependencies):
```
node --test (Get-ChildItem -Path "test" -Filter "*.test.mjs" | ForEach-Object { $_.FullName })
```
Result (this session): **253 tests, 253 pass, 0 fail, 0 skip**, exit code 0.

E2E Phase-4 fixtures reproduced directly against the actual logic modules: Eq40=52.8, Eq41=64, Eq42=0.20, Eq43=16, Eq44=18, Eq45=48, Eq46=34.8, reversed Eq44=�^'18. All match exactly.

Artifact: `VM0010.policy` (55,895 bytes, 39 entries, 22 schemas, 10 systemSchemas byte-identical to VM0033). SHA-256: `1D80BBAD84D274D6F2EBFD95730EA1233DC1DA8CEB9BDD5413E3241E02DC13D`. Embedded expressions byte-identical to source; `readme.md` untouched by build; every blockType is a real Guardian type; every schema `$ref` resolves. Processing-energy module now embeds Eqs (14)-(15),(18)-(21) (grid/generator branches) per VM0010 v1.4 §8.1.4 pp.31-33.

## Changed files (this completion drive)

| File | Change |
|------|--------|
| `test/schema-validation.test.mjs` | Expanded output-field regression from 8 → all 21 calculation modules |
| `schemas/project-stocks-821.schema.json` | Declared 3 emitted-but-undeclared fields — **defect fix** |
| `schemas/vm0010-unit-conversion.schema.json` | Declared 2 emitted-but-undeclared fields — **defect fix** |
| `VM0010.policy` | Rebuilt deterministically so packaged schema incorporates the fixes |
| `logic/project-hub-project-description-custom.js` | Added VCS-CCB joint template emission (criterion AC1) |
| `test/project-hub-mapping.test.mjs` | Added joint VCS-CCB template test |
| `README-slice.md` | Corrected staleness (Eq 47/non-CO2 implemented, not removed) |
| `PROGRESS-CHECKPOINT.md` | Corrected test count (233/232/1 skip) |
| `ACCEPTANCE-MATRIX.md` | Rebuilt against actual issue #5941 criteria |
| `INDEPENDENT-FIXTURES.md` | New: independent hand-computed fixtures + synthetic fixture + test instructions |
| `SUBMISSION-SUMMARY.md` | This file |

Pre-existing (untracked, not authored this session): `logic/`, `schemas/`, `test/*.test.mjs`, `build-policy.mjs`, `policy.config.json`, `E2E-TEST-PROCURE.md`, `FREE-ROUTER-HANDOFF.md`, `PHASE3-CALCULATION-SPEC.md`, `PROGRESS-CHECKPOINT.md`, `PROVENANCE.md`, `VM0010.policy` base, `output.txt`, `test-output.txt`.

## Acceptance matrix summary (full detail in ACCEPTANCE-MATRIX.md)

| Criterion (issue #5941) | Status |
|-------------------------|--------|
| AC1 All applicable program templates: VCS, VCS-CCB, CCB, SDVISta | PARTIAL — VCS+CCB emitted; VCS-CCB joint template now supported; SDVISta = N/A for AFOLU scope 14 |
| AC2 Transformation blocks to send data to Project Hub | PARTIAL — mapping present + tested; end-to-end delivery blocked by runtime |
| AC3 Calculation blocks covering every quantification approach | GAP — ~22 of 48 equations; remainder HOLD (B01-B12) |
| AC4 Workflow following VM0050 structure | PARTIAL — workflow shell present; VM0050 parity not demonstrated |
| DoD end-to-end tested / data to Project Hub / docs complete / guide+video | BLOCKED — runtime unavailable |

## Outstanding limitations / blockers

1. **Guardian runtime integration — BLOCKED (checked this session).** Guardian containers are up (incl. `guardian-acm0010-fresh-nondemo-web-proxy-1` on `127.0.0.1:3301->80`). `GET /api/v1/accounts/session` returns 200 (null); `POST /api/v1/accounts/login` with test credentials returns 401; `POST /api/v1/policies/import/file/preview` (non-mutating, `Content-Type: binary/octet-stream`, raw zip body) returns 401 without auth — route reachable but requires authenticated StandardRegistry permissions/credentials not available. No safe way to reconcile missing StandardRegistry DID or failed import task from read-only evidence without auth; no live imports/registrations/blockchain transactions performed.
2. **B01-B12 HOLD items / remaining equations** (PHASE3-CALCULATION-SPEC.md / ACCEPTANCE-MATRIX): class-carbon conversion, repeated indices, regrowth/cohort aggregation ambiguities, annual/cumulative reconciliation, GWP/COMF defaults, illegal-logging numerator, leakage bands, uncertainty estimator, and other not-fully-specified or HOLD equations (e.g. 9,10,13,22-28,35-39 as applicable) — require Verra/VVB clarification or authoritative corrections. Not invented.
3. **Template/Project Hub/runtime evidence** — VM0050 parity, VCS5/joint CCB template confirmation, Project Hub acceptance env, screenshots/demo/video/end-to-end delivery require maintainer/environment access.

## How to reproduce

```
cd "Methodology Library/DLT Earth Methodology Bounty Program/VM0010 V1.4"
node --test (Get-ChildItem -Path "test" -Filter "*.test.mjs" | ForEach-Object { $_.FullName })
```
Expected (this session): 253 tests, 253 pass, 0 fail, 0 skip. No `package.json`, no `node_modules`, no network, no live Hedera.
