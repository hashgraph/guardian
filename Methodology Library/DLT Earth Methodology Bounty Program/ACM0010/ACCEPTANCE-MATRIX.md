# ACM0010 - Issue #5945 Acceptance Matrix

**Bounty:** hashgraph/guardian#5945 - "ACM0010: GHG emission reductions from manure management systems"
**Repository:** guardian, branch `develop`, HEAD `52af20ea3`
**Slice dir:** `Methodology Library/DLT Earth Methodology Bounty Program/ACM0010`
**Outcome:** PARTIAL - offline implementation/test/build advanced (BE_CH4, BE_N2O, PE_Aer, PE_N2O 1&2, LE_y Eqs 22-26,31-32, MD_y 35, ER_y 33/34, PE_flare/transport/elec-heat, VSLT Eq 3/4-scaling/5, TOOL14 v03.0 PEAD/LEAD with Eq1-5,6-monitored-liquid,7,8 supported paths). Remaining gaps require external confirmation/sources/runtime/profile authorization.

**Provenance:** ACM0010 v09.0 draft (CDM-MP98-A01) `ACM0010_v09_draft.pdf` + `ACM0010_v09_text.txt` (pp.14-15 inspected via pypdf layout + PyMuPDF spans/words/blocks/chars). `ACM0010_v03.pdf`, `ACM0010_v04.pdf` used for Eq(4) scaling cross-check. IPCC 2019 Refinement Vol.4 Ch.10 (`Eq 10.22a`/Table 10.13a context) retrieved/cross-checked. TOOL14 v03.0 (EB 123 Annex 2, 7 Nov 2024) retrieved from official CDM URL and text-extracted. CDM v08 direct URL returned non-PDF (Incapsula). Local CDM Tool 14 `.tool` is Guardian package, not equation text.

Legend: PASS = implemented + test-verified · PARTIAL = implemented but criterion not fully satisfied · GAP = not implemented / requires external resolution

## Acceptance Criteria (from issue #5945)

| # | Criterion | Status | Evidence / file | Test coverage |
|---|-----------|--------|-----------------|---------------|
| AC1 | All applicable program templates added to the policy: **VCS, VCS-CCB, CCB, SDVISta** | PARTIAL | `logic/project-hub-project-description-custom.js`; DTA block `acm0010-pd-hub-transform` | `test/project-hub-mapping.test.mjs` - VCS+CCB+SDVISta emitted; VCS-CCB joint template supported (`vcs+ccb.v4.4`) |
| AC2 | All applicable transformation blocks configured to send data to Project Hub | PARTIAL | `dataTransformationAddon` on project-description + monitoring-report blocks | PD + monitoring DTAs present/tested; end-to-end delivery blocked by runtime/profile |
| AC3 | Calculation code covering **every quantification approach** in the methodology | PARTIAL | `logic/calculate-baseline-ch4.js`, `logic/calculate-pe-ad.js`, `logic/calculate-leakage.js`, `logic/calculate-er.js`, `logic/calculate-pe-flare.js`, `logic/calculate-pe-transport.js`, `logic/calculate-pe-elec-heat.js`, schemas/build | `test/calculate-baseline-ch4.test.mjs`, `test/vslt-options-2-4.test.mjs`, `test/vslt-option3-eq4.test.mjs`, `test/calculate-pe-ad.test.mjs`, `test/calculate-pe-ad-eq6.test.mjs`, `test/calculate-leakage-er.test.mjs`, load/schema/workflow tests |
| AC4 | Workflow following VM0050 structure/logic | PARTIAL | `policy.config.json` workflow shell (6 stages + VVB verification/approval; roles PP/VVB/Owner) | `test/workflow-shell.test.mjs`, `test/load-artifact.test.mjs`; VM0050 not in repo for parity proof |

## AC3 detail - implemented vs missing

**Implemented and test-verified (ACM0010 v09 draft / CDM-MP98-A01):**

| Approach | Equation | Status | Evidence |
|----------|----------|--------|----------|
| Baseline methane | BE_CH4,y | PASS | Staged AWMS chain, VS decay, direct VS, herd-derived VS, VSLT Option 2 Eq (3), Option 4 Eq (5), Option 3 Eq (4) scaling `(Wsite/Wdefault)*VSdefault*ndy` (v03/v04-aligned; v09 Eq4 layout ambiguous, provenance recorded) |
| Baseline N2O | BE_N2O,y (Eqs 6-8) | PASS | Direct + indirect N2O, 44/28 + GWP, gated |
| Project aerobic CH4 | PE_Aer,y | PASS | 0.1% of generating potential, F_Aer scaling |
| Project N2O Option 1/2 | PE_N2O,y (Eq 19-20) | PASS | Per-stage factors/RN decay and measurement-based option |
| CH4 density | D_CH4 = 0.00067 t/m3 | PASS | Single authoritative value |
| Leakage N2O | LEBL,N2O,y / LEPJ,N2O,y (Eqs 23-26) | PASS | Direct + indirect N2O, EF1/EF4/EF5, F_leach, F_gasm, RN decay |
| Leakage CH4 | LEBL,CH4,y / LEPJ,CH4,y (Eqs 31-32) | PASS | MCF_d, RVS decay, MS%_j |
| Total leakage | LE_y (Eq 22) | PASS | Net positive N2O/CH4 leakage + LEAD_y (TOOL14/fallback) |
| Methane destroyed/captured | MD_y (Eq 35) | PASS | BG_burnet,y · w_CH4,y · D_CH4 · GWP_CH4 |
| Emission reductions (ex ante) | ER_y (Eq 33) | PASS | BE_y - PE_y - LE_y |
| Emission reductions (ex post) | ER_y,ex post (Eq 34) | PASS | min[(BE_CH4,ex post - PE_y,ex post), (MD_y - PE_y - LE_y)] |
| Project flare | PE_flare,y | PASS | Implemented + embedded/wired |
| Project transport | PE_transport,y | PASS | Implemented + embedded/wired |
| Project electricity/heat | PE_elec/heat,y | PASS | Implemented + embedded/wired |
| VSLT Option 2 (dietary intake) | Eq (3) | PASS | `[GE*(1-DE/100)+(UE*GE)]*[(1-ASH)/ED]*nd_y`, numerical/boundary tests |
| VSLT Option 3 (scaling) | Eq (4) | PARTIAL (documented) | `(Wsite/Wdefault)*VSdefault*ndy` implemented + tested per v03/v04 & unit-consistent intent; **v09 draft p.14 extracted/layout ambiguous (VSdefault/VSrate adjacency)** — cross-checked vs IPCC 2019 Ch.10 Eq 10.22a, not claimed as final unambiguous v09 rendering |
| VSLT Option 4 (IPCC rate) | Eq (5) | PASS | `VSrate/1000*W*nd_y`, numerical + herd-derived N_LT test |
| Project emissions from anaerobic digester | PEAD,y (TOOL14 v03.0 Eq 1-4) | PASS (supported paths) | `logic/calculate-pe-ad.js`; Step1 Opt2 Eq(2), Step2 Eq(3)/monitored/renewable-zero, Step3/5 monitored-direct as required, Step4 Eq(4); integrated in ER (AD flare double-count avoided) |
| Leakage from anaerobic digester | LEAD,y (TOOL14 v03.0 Eq 5,7,8,6-monitored-liquid) | PASS (supported paths) | Eq(7)/(8) defaults, **Eq(6)** monitored liquid `Qstored*PCOD*B0*MCF*GWPCH4` (B0 default 0.25), LECOMP monitored/direct; integrated in leakage/ER |

## Validator evidence (Guardian compiled SchemaImportExportHelper)

All 8 packaged schemas validated against the actual compiled `SchemaImportExportHelper.validateDefs` in container `guardian-acm0010-fresh-nondemo-guardian-service-1`:

| Check | Result |
|---|---|
| validateDefs, original IRIs (8 schemas) | **8/8 passed** |
| validateDefs, import-time UUID remapped (8 schemas) | **8/8 passed** |
| Circular dependency check | **0 found** |
| Reference resolution (4 `$ref`s in pristine docs) | **4/4 resolved** |
| Reference resolution after UUID remap | **0 failures** |
| Negative tests (non-existent IRI, circular dep, unresolvable ref, empty schema, companion schema, cache hit, transitive circular) | **7/7 passed** |

See `run-full-validator-v2.mjs` (container-local) for the validator execution.

## Not implemented / conditional (not invented)

| Gap | Status | Reason / evidence needed |
|-----|--------|---------------------------|
| VSLT Eq (4) exact v09 term/operator rendering | REQUIRES EXTERNAL CLARIFICATION (documented) | v09 draft p.14 extracted/layout shows `VSdefault` and `VSrate,LT,y/1000` adjacent; v03/v04 give unambiguous `(Wsite/Wdefault)*VSdefault*ndy`. Implemented v03/v04-aligned scaling form with provenance and IPCC 2019 Eq 10.22a cross-check; strict v09 Eq(4) claim pending unambiguous source rendering. |
| TOOL14 solid digestate Option 1 (TOOL04 model) and any paths requiring other tool models | CONDITIONAL | Supported via monitored/externally derived inputs (e.g. `monitoredLeStorageTCo2e`, `monitoredPeFlareTCo2e`, TOOL03/05/06/13 results). Full reimplementation of external tool models not claimed. |
| Full UNFCCC tool procedural execution (TOOL02/03/05/06/08/12/13 applicability/QC beyond supported inputs) | CONDITIONAL/EXTERNAL | Only unambiguously implementable/supported pathways encoded; no invention. |
| VM0050 workflow parity proof | GAP (external) | VM0050 not in repo for parity proof. |

## Definition of Done / Documentation / Runtime

| Item | Status | Notes |
|------|--------|-------|
| Templates/data transformation end-to-end | BLOCKED | Runtime delivery unverified |
| All quantification approaches validated | PARTIAL | Implemented set above validated; external gaps remain |
| Docs/screenshots/video | PARTIAL/BLOCKED | Offline docs updated; live runtime evidence requires environment+auth/profile |
| Guardian runtime integration (checked this session, read-only) | BLOCKED | Containers up incl. `guardian-acm0010-fresh-nondemo-web-proxy-1` (`127.0.0.1:3301->80`). `GET /api/v1/accounts/session` → 200 (null). `POST /api/v1/accounts/login` (test creds) → 401. Authorized SR bearer obtained via runtime env creds (not printed) → 200; `GET /api/v1/profiles/StandardRegistry` shows `confirmed=false`, no `did`, no `hederaAccountId`; `freshnondemo_testnet_undefined.did_document` count 0. `POST /api/v1/policies/import/file/preview` (raw zip, bearer) for ACM0010 and VM0010 → **422** with api-gateway log `HttpException: User is not registered` (`EntityOwner/importPolicyFromFilePreview`). No DID/profile registration, no Hedera transactions, no import performed (owner authorization required). Existing DRAFT policy `6afc85edcfeefebf926aaaf6` preserved — not touched, not imported, not deleted. |

## Test results (reproducible, zero dependencies)

Command:
```
node build-policy.mjs
node --test test/*.test.mjs
```

Result (this session): **250 tests, 250 pass, 0 fail, 0 skip**, exit code 0.

Artifact: `ACM0010.policy` (58,128 bytes, 20 entries, 4 policy schemas + 4 companion subject schemas + 10 systemSchemas from VM0033). SHA-256: `1363230E5522C75FA9A3BD0407707888E89AFE6CE70B00B665F3878ACF8051D6`. New tests: `test/vslt-option3-eq4.test.mjs` (3), `test/calculate-pe-ad-eq6.test.mjs` (3).

## PR #7402 status

- **Mergeable:** CONFLICTING — conflict resolved locally in `api-gateway/package.json` (dependency version bumps from develop: mikro-orm 6.6.16→6.6.17, ws 8.21.3→8.22.0, @types/node 24.13.6→24.19.1, @types/ws 8.18.1→8.18.2; version 3.7.1-rc→3.7.1; cross-platform build script `node scripts/copy-env.mjs` retained).
- **DCO:** ACTION_REQUIRED — needs `Signed-off-by` trailer on commit(s).
- **Assignee Check:** FAILURE — needs PR assignee(s).
- **Title Check:** SUCCESS.
- All required CI checks passed except Assignee and DCO (both are metadata/administrative, not code).
