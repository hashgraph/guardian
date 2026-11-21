# ACM0010 - Submission Evidence (issue #5945)

**Bounty:** hashgraph/guardian#5945 — **Repo:** guardian, branch `develop`, HEAD `52af20ea3` (PR #7402 head)
**Outcome:** PARTIAL (offline implementation/test/build advanced; runtime/external gaps remain)

## Sources inspected (this session)
- ACM0010 v09.0 draft (CDM-MP98-A01) PDF/text; pp.14-15 inspected around VSLT Eqs 3–5 using pypdf layout extraction and PyMuPDF spans/words/blocks/chars (visual-layout/coordinate inspection; image rendering attempted but model cannot interpret raster image).
- ACM0010 v03/v04 PDFs cross-checked for Option 3 Eq(4) scaling.
- IPCC 2019 Refinement Vol.4 Ch.10 (Livestock) PDF retrieved (`19R_V4_Ch10_Livestock.pdf`) and cross-checked: Eq 10.22a `VS = VSrate * TAM / 1000 * 365` (VSrate kg VS per 1000 kg animal mass/day) vs VSdefault kg-dm/animal/day.
- **TOOL14 v03.0** (EB 123 Annex 2, valid 7 Nov 2024) retrieved from `https://cdm.unfccc.int/methodologies/PAmethodologies/tools/am-tool-14-v3.pdf` and text-extracted.

## Reproducible results
- `node build-policy.mjs` → `ACM0010.policy` **58,128 bytes**, 20 entries. **SHA-256:** `1363230E5522C75FA9A3BD0407707888E89AFE6CE70B00B665F3878ACF8051D6`.
- `node --test test/*.test.mjs` → **250 pass / 0 fail / 0 skip**, exit 0.

## New/changed implementation (actual code)
- `logic/calculate-baseline-ch4.js`: added explicit **VSLT Option 3 Eq(4) scaling** via `vsltOption3Eq4Scaling` (legacy `herdParameters` alias retained): `VSLT = (Wsite/Wdefault)*VSdefault*ndy` per-animal, annualized by `N_LT`; provenance recorded. v09 draft p.14 layout ambiguous (adjacent `VSdefault`/`VSrate,LT,y/1000`), so strict v09 rendering not claimed.
- `logic/calculate-pe-ad.js`, `logic/calculate-er.js`, `logic/calculate-leakage.js`: added **TOOL14 Eq(6)** liquid monitored path `LEstorage = Qstored*PCOD*B0*MCF*GWPCH4` (B0 default 0.25, MCF required per Table 10).
- `schemas/project-description.schema.json`: added `vsltOption3Eq4Scaling` and Eq(6) fields (`qStoredM3PerYear`, `pCodTonnesPerM3`, `b0TCh4PerTCod`, `mcf`).
- New tests: `test/vslt-option3-eq4.test.mjs` (3), `test/calculate-pe-ad-eq6.test.mjs` (3); full regression green.

## Acceptance gaps closed / advanced
- **VSLT Eq(4):** implemented and numerically tested as v03/v04-aligned, unit-consistent scaling form with documented ambiguity and IPCC cross-check (previously unresolved/undocumented as explicit option).
- **TOOL14 conditional leakage:** Eq(6) monitored liquid pathway implemented (previously monitored/direct-only for that case).
- **Audit:** PEAD/LEAD integration remains consistent with supported TOOL14 Eqs 1-5,7,8 and avoids AD-flare double counting in ER.

## Validator results (Guardian compiled SchemaImportExportHelper, container run)
- 8/8 packaged schemas passed `validateDefs` with original IRIs and with import-time UUID remapped IRIs.
- Circular dependencies: 0 found.
- Reference resolution: 4/4 refs resolved; 0 after remapping.
- Negative tests: 7/7 passed (non-existent IRI, circular dep, unresolvable ref, empty schema, companion schema, cache hit, transitive circular).

## Still conditional / external (not invented)
| Gap | Status | Reason |
|---|---|---|
| VSLT Eq(4) exact v09 printed operator/term rendering | REQUIRES EXTERNAL CLARIFICATION | v09 p.14 extracted/layout ambiguous; implemented form documented with provenance. |
| TOOL14 solid digestate Option 1 (TOOL04) and other external tool models/procedures | CONDITIONAL | Accept monitored/externally derived inputs; not fully reimplemented. |
| VM0050 parity, live Guardian/Project Hub E2E, screenshots/video | BLOCKED | VM0050 absent in repo; SR unregistered (`confirmed=false`, no DID/Hedera), preview 422 `User is not registered`. No DID/import/Hedera/credential actions taken. |

## Guardian runtime (read-only evidence)
- `127.0.0.1:3301` up. Session 200(null); test login 401; authorized SR bearer 200. SR profile `confirmed=false`, no DID/Hedere; Mongo `freshnondemo_testnet_undefined.did_document` 0.
- Policy preview (ACM0010/VM0010, raw zip, bearer) → **422 `User is not registered`** (`EntityOwner/importPolicyFromFilePreview`). No DID registration/import/Hedera tx performed.
- **Owner approval required:** complete StandardRegistry profile/DID registration via supported Guardian flow (dedicated SR/account separation), then re-run preview/import and live E2E. **Security:** exposed operator key must not be used for new transactions (key rotation deferred ≠ authorization). No placeholder DID/DB bypass/password reset/account reuse.
- Existing DRAFT policy `6afc85edcfeefebf926aaaf6` was preserved; no import/publish/delete/reset performed against it.

## PR #7402 status
- Head: `bounty/acm0010-5945` @ `52af20ea3`
- Base: `develop` @ `6800a92a3` (develop has since moved to `24217a658`)
- Mergeable: **CONFLICTING** — resolved locally by adopting develop's `api-gateway/package.json` (version 3.7.1, mikro-orm 6.6.17, ws 8.22.0, @types/node 24.19.1, @types/ws 8.18.2) while retaining the cross-platform build script.
- Checks: Title Check SUCCESS, PR Formatting (DCO) ACTION_REQUIRED, PR Formatting (Assignee) FAILURE, Wiz SAST/Vulnerability/Data/IaC/Secret NEUTRAL, StepSecurity HARDENER SUCCESS, conventional-pr-title SUCCESS.

## How to reproduce
```
cd "Methodology Library/DLT Earth Methodology Bounty Program/ACM0010"
node build-policy.mjs
node --test (Get-ChildItem -Path "test" -Filter "*.test.mjs" | ForEach-Object { $_.FullName })
```
