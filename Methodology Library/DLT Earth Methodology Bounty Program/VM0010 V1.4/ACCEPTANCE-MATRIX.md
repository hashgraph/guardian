# VM0010 v1.4 — Issue #5941 Acceptance Matrix

**Bounty:** hashgraph/guardian#5941 — "VM0010: Improved Forest Management, Conversion from Logged to Protected Forest (v1.4)"
**Repository:** guardian, branch `develop`, HEAD `089c11698`
**Slice dir:** `Methodology Library/DLT Earth Methodology Bounty Program/VM0010 V1.4`
**Outcome:** BLOCKED for final submission — see gap analysis below. All SAFE offline work is complete.

Source of acceptance criteria: issue #5941 body (Acceptance Criteria / Definition of Done / Documentation Requirements), retrieved live from GitHub.

Legend: PASS = implemented + test-verified · PARTIAL = implemented but criterion not fully satisfied · GAP = not implemented / requires external resolution

## Acceptance Criteria (from issue #5941)

| # | Criterion | Status | Evidence / file | Test coverage |
|---|-----------|--------|-----------------|---------------|
| AC1 | All applicable program templates added to the policy: **VCS, VCS-CCB, CCB, SDVISta** | PARTIAL | `logic/project-hub-project-description-custom.js`; `policy.config.json` DTA block `vm0010-pd-hub-transform` | `test/project-hub-mapping.test.mjs` — VCS + CCB emitted; **VCS-CCB joint template now supported** (`standardTemplate='vcs+ccb.v4.4'` when `standardTemplate='VCS+CCB'`); SDVISta treated as N/A for AFOLU scope 14 (per issue DoD note: scope 14 uses VCS, CCB, joint VCS-CCB) — documented as assumption |
| AC2 | All applicable transformation blocks configured to send data to Project Hub | PARTIAL | `dataTransformationAddon` on project-description block; Project Hub CUSTOM mapping | Mapping present + tested structurally; **end-to-end delivery to Project Hub not verifiable** — Guardian runtime blocked (see BLOCKERS) |
| AC3 | Calculation code covering **every quantification approach** in the methodology | GAP | 22 logic modules (`logic/`) covering Eqs 1,2,3,4,5,6,7,8,11,12,33,34,40,41,42,43,44,45,46,47,48 + A01,A02,A03 | Per-equation `test/calculate-*.test.mjs`; **remaining equations (9,10,13-21,22-28,35-39) are HOLD per PHASE3-CALCULATION-SPEC.md §7 (B01-B12)** — require Verra/VVB methodology clarification, not invention |
| AC4 | Workflow following VM0050 structure/logic | PARTIAL | `policy.config.json` workflow shell (3 stages, roles Project Proponent/VVB, `policyNavigation`); container layout matches VM0033/VM0047 precedent | `test/load-artifact.test.mjs` (blockTypes, layout, systemSchemas); **VM0050 workflow parity not demonstrated** — VM0050 approved policy not in this repo; requires maintainer confirmation |

## Definition of Done (from issue #5941)

| Item | Status | Notes |
|------|--------|-------|
| Only applicable program templates tested end-to-end | BLOCKED | Requires live Guardian runtime + Project Hub; runtime blocked (no auth route reachable, no import endpoint, no credentials) |
| Data successfully sent to Project Hub via transformation blocks | BLOCKED | Same — no working auth/login (`POST /api/v1/auth/login` → 404 through web-proxy: nginx strips `/api/v1/`), no `POST /api/v1/policies` import route, no credentials |
| All quantification approaches validated against the methodology | GAP | HOLD items B01-B12 (PHASE3-CALCULATION-SPEC.md §7) |
| Documentation complete, reviewed, published | PARTIAL | `PROVENANCE.md`, `README-slice.md`, `PHASE3-CALCULATION-SPEC.md`, `FREE-ROUTER-HANDOFF.md`, `ACCEPTANCE-MATRIX.md`, `INDEPENDENT-FIXTURES.md`, `SUBMISSION-SUMMARY.md`; **step-by-step guide with screenshots + demo video not possible offline** |
| Step-by-step guide or demo video finalized + accessible | BLOCKED | Requires live runtime for screenshots/video |

## Documentation Requirements (from issue #5941)

| Item | Status | Evidence |
|------|--------|----------|
| Full methodology introduction written | PARTIAL | `README-slice.md`, `PROVENANCE.md` |
| Important roles defined and documented | PASS | `policy.config.json` policyRoles (Project Proponent, VVB); README roles |
| Workflow documented | PARTIAL | `FREE-ROUTER-HANDOFF.md`, `policy.config.json` workflow shell |
| Important schemas included | PASS | 22 schemas under `schemas/`; all packaged + IRI-wired |
| Step-by-step guide with screenshots + demo video | BLOCKED | Requires live runtime |

## E2E Phase-4 fixtures (reproduced against actual logic modules)

| Fixture | Expected | Actual | Result |
|---------|----------|--------|--------|
| Eq (40) ER_t* C_FUEL=20, BSL=−100, PRJ=−10, LF=0.4, U=0.2 | 52.8 | 52.8 | PASS |
| Eq (41) CR_t* PRJ=100, BSL=20, U=0.2 (no LF) | 64 | 64 | PASS |
| Eq (42) U_total U_PRJ=0.12, U_BSL=0.16 | 0.20 | 0.20 | PASS |
| Eq (43) Bu_CR PRJ=100, BSL=20, NPR=0.20 | 16 | 16 | PASS |
| Eq (44) Bu_ER PRJ=−10, BSL=−100, NPR=0.20 | 18 | 18 | PASS |
| Eq (45) VCU_CR CR=64, Bu_CR=16 | 48 | 48 | PASS |
| Eq (46) VCU_ER ER=52.8, Bu_ER=18 | 34.8 | 34.8 | PASS |
| Eq (44) reversed PRJ=−100, BSL=−10 (review case) | −18 | −18 | PASS |

## Test results (reproducible, zero dependencies)

```
cd "Methodology Library/DLT Earth Methodology Bounty Program/VM0010 V1.4"
node --test test/*.test.mjs
```
Result: **233 tests, 232 pass, 0 fail, 1 skip**, exit code 0.
- Skip: optional AJV cross-check (`ajv` declared in `common/`/`interfaces/` but not installed; full workspace `yarn install` out of scope). Dependency-free validator (`test/_schema-validator.mjs`) covers equivalent validation; all other layers pass.

## Changed files (this completion drive)

| File | Change |
|------|--------|
| `test/schema-validation.test.mjs` | Expanded output-field regression mapping from 8 → all 21 calculation modules |
| `schemas/project-stocks-821.schema.json` | Declared 3 emitted-but-undeclared fields (`monitoringInterval`, `annualStockGainDetails`, `bAbsentLookup`) — **defect fix** |
| `schemas/vm0010-unit-conversion.schema.json` | Declared 2 emitted-but-undeclared fields (`validationStatus`, `validatedAt`) — **defect fix** |
| `VM0010.policy` | Rebuilt deterministically (55,202 bytes) so packaged schema incorporates the two fixes |
| `logic/project-hub-project-description-custom.js` | Added VCS-CCB joint template emission (`standardTemplate='vcs+ccb.v4.4'` when `standardTemplate='VCS+CCB'`) |
| `test/project-hub-mapping.test.mjs` | Added joint VCS-CCB template test |
| `README-slice.md` | Corrected staleness: Eq (47)/non-CO2 files are implemented (not removed); production-gated on B06 |
| `PROGRESS-CHECKPOINT.md` | Corrected test count (233/232/1 skip) |
| `ACCEPTANCE-MATRIX.md` | New/rebuilt against actual issue #5941 criteria |
| `INDEPENDENT-FIXTURES.md` | New: consolidated independent hand-computed fixtures + synthetic fixture + test instructions |
| `SUBMISSION-SUMMARY.md` | New: submission evidence package |

## BLOCKERS (require human / environment resolution — not safe to work around)

1. **Guardian runtime integration — BLOCKED.** Docker is now healthy (15 containers running, web-proxy:3000 → 200 OK, `/api/v1/policies` → 401). However:
   - `POST /api/v1/auth/login` → **404** through web-proxy (nginx strips `/api/v1/` prefix; NestJS auth controller is at `api/v1/auth/login`). No reachable auth route → cannot obtain session cookies.
   - No `POST /api/v1/policies` policy **import** route exists in this codebase version (only redecode/reparse for existing policies by topicId, `@AdminWrite()`-guarded).
   - No credentials available; creating/changing accounts is prohibited by operating rules. `seedInitialAdmin` requires `INITIAL_ADMIN_EMAIL`/`INITIAL_ADMIN_PASSWORD` env vars (not set).
   - No live Hedera transactions permitted.
   → Cannot import `VM0010.policy`, cannot execute a synthetic project, cannot verify end-to-end Project Hub delivery.

2. **Equations (9)/(10) and B01-B12 HOLD items** (PHASE3-CALCULATION-SPEC.md §7): wood-product class-carbon conversion, repeated indices, regrowth time, annual/cumulative reconciliation, universal GWP, COMF default, illegal-logging numerator, leakage bands, uncertainty estimator. Require Verra/VVB methodology clarification; must not be invented.

3. **B12 (VM0050 export, VCS5/joint CCB templates, Project Hub acceptance environment):** external to this slice; maintains comment on #5941 says VCS5/joint CCB templates are being developed.

4. **Screenshots / demo video / end-to-end Project Hub evidence:** require live Guardian runtime + credentials (blocked above).

## Bottom line

All mandatory acceptance criteria that can be satisfied offline without inventing methodology decisions or requiring live runtime are implemented and test-verified (232/0/1). The remaining gaps (AC3 full quantification coverage, AC2/DoD end-to-end Project Hub delivery, documentation video/screenshots, AC4 VM0050 workflow parity) are **blocked** by missing governing clarifications (B01-B12, B12) and the unavailable Guardian runtime/auth. Neither inventing interpretations nor forcing runtime access is permitted. **VM0010 is BLOCKED for submission pending those external resolutions.**
