# VM0010 v1.4 — Vertical Slice

**Status:** development slice for [Guardian issue #5941](https://github.com/hashgraph/guardian/issues/5941).
**Not** a bounty submission. Nothing here is committed, staged, pushed or published.

Equation (7) was corrected on 6 Oct 2026 to use `BCEF_R`, the parameter printed in
its Where-block on p. 23. See [Corrected: Equation (7)](#corrected-equation-7)
below and `PROVENANCE.md` §5.

This folder already contained a tracked `readme.md` (0 bytes). That file is
**not modified** and **not packaged** into the `.policy`; a test asserts both.

## What this slice contains

Twelve Guardian `customLogicBlock` calculations covering fourteen baseline
quantification equations, plus one Verra Project Hub CUSTOM Project Description
mapping for sectoral scope 14.

| # | Eq | Section | Page | Logic file | Output schema |
|---|---|---|---|---|---|
| 1 | (48) | Appendix 2 | 88 | `calculate-c-fuel.js` | `baseline-fossil-fuel-emissions` |
| 2 | (3), (4) | §8.1.1 | 20, 21 | `calculate-carbon-stocks-811.js` | `carbon-stocks-811` |
| 3 | (6) | §8.1.2 | 23 | `calculate-rsd-812.js` | `rsd-812` |
| 4 | (5) | §8.1.2 | 22 | `calculate-deadwood-812.js` | `deadwood-812` |
| 5 | (7) | §8.1.2 | 23 | `calculate-infra-812.js` | `infra-812` |
| 6 | (8) | §8.1.3 | 24 | `calculate-extracted-813.js` | `extracted-813` |
| 7 | (11) | §8.1.3 | 26 | `calculate-woodproducts-813.js` | `wood-products-813` |
| 8 | (12) | §8.1.4 | 26 | `calculate-c-fuel.js` | `baseline-fossil-fuel-emissions` |
| 9 | (40)-(41) | §8.4 | pp.49-50 | `calculate-net-benefits-84.js` | `net-benefits-84` |
| 10 | (42) | §8.4 | p.51 | `calculate-uncertainty-85.js` | `uncertainty` |
| 11 | (43)-(44) | §8.4 | pp.51-52 | `calculate-vcus-86.js` | `vcus-86` |
| 12 | (45)-(46) | §8.4 | p.52 | `calculate-vcus-86.js` | `vcus-86` |

All fourteen were verified against PHASE3-CALCULATION-SPEC.md and, where page
accessible, against the rendered PDF.

## Representative path

1. **Input** — Project Description VC carrying the IFM baseline activity, strata
   volumes, and the harvest/residual-damage parameters.
2. **Calculations** — the seven `customLogicBlock`s in the table above.
   - **Eq (12), as corrected** — `C_FUEL = E_HARVEST + E_HAULING + E_TRANSPORT +
     E_PROCESSING`, emitted in **tCO2e** with **no divisor**, per Correction 3 of
     the *Corrections and Clarifications to VM0010 v1.3 and v1.4* (4 September
     2026). S1 p. 26 prints a trailing `44/12`; the unit correction makes it
     redundant, so it is not applied.
   - **Eq (48)** — `EF_FUEL-GHG = EF_IPCC-FUEL x HV_FUEL x ρ_FUEL / 1000`, used
     inside the `C_FUEL` calculation to derive per-fuel emission factors.
   - **Eqs (5)–(8)** — the dead-wood chain: residual stand damage (6), dead wood
     (5), forestry-infrastructure biomass not harvested (7), and extracted timber
     across species (8).
3. **Outputs** — signed VCs against the per-calculation output schemas.
4. **Transformation** — a `dataTransformationAddon` emitting a Verra Project Hub
   CUSTOM Project Description with `vcs` and `ccb` program sub-objects and
   `projectType: '14'`.

The `dataTransformationAddon` and the Project Hub mapping are **intended scope**,
not incidental. `policy.config.json` cites VM0033's `dataTransformationAddon` as
its structural precedent, and `test/project-hub-mapping.test.mjs` covers it.

## Slice scope

| In scope | Out of scope |
|---|---|
| §8.1.1 Eqs (3), (4) — harvested biomass and extracted timber per species | Eq (1), Eq (2) — sample-plot volume estimation |
| §8.1.2 Eqs (5), (6), (7) — dead wood chain | Eq (9), Eq (10) — see below |
| §8.1.3 Eqs (8), (11) — extracted timber across species; wood products | §8.2 project emissions, allometry, disturbance, illegal logging |
| §8.1.4 Eq (12) baseline fossil fuel term, corrected | §8.3 leakage |
| Appendix 2 Eq (48) fuel emission factor conversion | §8.3 leakage variables not independently sourced |
| §8.4 Eqs (40)-(41) corrected net reductions and removals | Eqs (40)/(41) LF_ME applied to Eq (41) — prohibited |
| §8.4 Eq (42) combined uncertainty `U_total|LtPF` | Appendix 1 Eq (47) — deferred, see below |
| §8.4 Eqs (43)-(46) buffer and VCU arithmetic | VT0001 additionality |
| One Verra Project Hub CUSTOM mapping, scope 14 | |

## Parked: Eq (9) and Eq (10)

**Eq (9)** is `dCWP0,i|BSL = SUM_k ( CEX,i,k|BSL x (WWk + SLFk) )` (p. 25) and is
**not implementable** for two independent reasons:

1. `SLFk` for the `"other"` class has no confirmed provenance. §9.1 p. 69 carries
   only a single combined `OF, SLF, WW` row with no per-class value for `"other"`.
   No value is assumed, defaulted to zero, or excluded.
2. `CEX,i,k|BSL` — the carbon stock **per wood-product class** — is itself
   unsourced. It has no §9.1 Data/Parameter row and no equation derives it from
   `CEX,j,i|BSL`. The Document History (p. 92) records it only as *"clarified to
   be the mean carbon stock of extracted timber per unit area in stratum i, for
   wood product type k"* — a definition, never a derivation.

**Eq (10)** consumes Eq (9)'s output, so it is parked with it.

Eq (8) does **not** unblock either: Eq (8) produces `CEX,i|BSL`, which sums over
species `j`. Eq (9) needs the class-level split `CEX,i,k|BSL`.

## Corrected: Equation (7)

`logic/calculate-infra-812.js` previously read its conversion factor from an input
named `aHbJ`. **No such parameter exists in VM0010 v1.4.** S1 p. 23 prints Eq (7)
as:

```
CnotHB,INF,j,i|BSL = VnotEX,INF,j,i|BSL x BCEFR x CFj
```

The multiplier is `BCEF_R`, which has a §9.1 Data/Parameter row at p. 67 and is
already carried on `strata[].bcefR` for Eq (3).

- Arithmetic is unaffected — three factors multiply either way, so no test value
  changed.
- Provenance was wrong: the schema exposed a required input that no methodology
  paragraph defines.
- Root cause: `aHbJ` was a misreading of mojibake glyphs from a PDF extraction
  that lacked layout mode. Layout-mode extraction reads the equation correctly.

**Corrected 6 Oct 2026.** The input is now `bcefR`, in `logic/calculate-infra-812.js`,
`schemas/infra-812.schema.json`, `schemas/project-description.schema.json` and the
affected tests. `A_HB,j` remains only as a historical mention in the
`calculate-infra-812.js` header and in `PROVENANCE.md` §5.

## Deferred: Appendix 1, Eq (47) (CH4 / N2O) — implemented kernel, production-gated

**Eq (47) IS implemented in this slice** (`logic/calculate-non-co2-emission-factor.js`,
`schemas/non-co2-emission-factor.schema.json`,
`test/calculate-non-co2-emission-factor.test.mjs`) and is wired into
`policy.config.json`, `build-policy.mjs` and the packaged `VM0010.policy`. It is a
pure arithmetic kernel: `EF = EF_CH4*GWP_CH4 + EF_N2O*GWP_N2O`, with explicit,
versioned GWP values supplied as inputs (never hard-coded) and per-row activity
metadata preserved.

Production use of Eq (47) remains gated on clarification B06: the governing VCS
GWP profile (version/set) must be confirmed before CH4/N2O factors are used in
crediting arithmetic. The `nonCo2Gases` input block is correctly absent — nothing
consumes it and the schema deliberately does not declare it (covered by
`test/schema-validation.test.mjs`).

Constraints that apply when Eq (47) scope is authorised:

1. **Emission-factor assumptions must be explicitly enforced and tested.**
   Appendix 1 states no numeric GWP values, so the applicable GWP set (VCS,
   IPCC) must be pinned rather than assumed.
2. `EF_FUEL-GHG` carries CO2, CH4 and N2O as three distinct outcomes. A
   tCO2e-labelled total must not silently absorb a non-CO2 factor — see
   `PROVENANCE.md` §4 item 5.

## Verification

The focused Equation (7) regression suite runs on a clean checkout of PR #7107
using only its tracked calculation, schemas and test helper. From the repository
root:

```
node --test "Methodology Library/DLT Earth Methodology Bounty Program/VM0010 V1.4/test/calculate-infra-812.test.mjs"
```

These nine tests execute `logic/calculate-infra-812.js` directly and check the
input/output schema constraints. They require no generated `.policy`, builder,
package installation or other calculation modules. The helper `_artifact.mjs`
does not load an artifact when imported; its artifact readers remain strict.

The full local slice suite separately checks the real Equation (7) policy wiring
and that its packaged expression matches the tracked source byte-for-byte. It
requires the broader slice files, which are outside the correction PR. From this
folder:

```
node build-policy.mjs
node --test test/*.test.mjs
```

Build is deterministic: repeated runs produce a byte-identical `VM0010.policy`
(SHA-256 verified). Suite result at the time of writing: **236 tests, 235 pass,
0 fail, 1 skipped.** The skip is the AJV cross-check in
`test/schema-validation.test.mjs`; AJV is declared in the repository but is not
installed, and installing dependencies is out of scope. Primary validation runs
through the dependency-free validator in `test/_schema-validator.mjs`.

Zero-install is a deliberate constraint of this slice, not an oversight.

## Eq (40)-(46) — C_NET vs DC_NET Distinction

Eq (41) uses `DC_NET|BSL,t*` (dcNetBsl) while Eqs (43)-(44) use `C_NET|BSL,t*`
(cNetBsl). These are distinct variables per PHASE3-CALCULATION-SPEC.md line 412,
which notes the source "omits delta on baseline" for the buffer formulas and
defines `C_NET|BSL,t*` as "a net stock change, not an absolute standing stock."
Both inputs must be supplied separately; neither may be silently aliased.
