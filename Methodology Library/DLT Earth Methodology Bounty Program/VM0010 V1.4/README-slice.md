# VM0010 v1.4 — Vertical Slice

**Status:** development slice for [Guardian issue #5941](https://github.com/hashgraph/guardian/issues/5941).
**Not** a bounty submission. Nothing here is committed, staged, pushed or published.

Equation (7) was corrected on 6 Oct 2026 to use `BCEF_R`, the parameter printed in
its Where-block on p. 23. See [Corrected: Equation (7)](#corrected-equation-7)
below and `PROVENANCE.md` §5.

This folder already contained a tracked `readme.md` (0 bytes). That file is
**not modified** and **not packaged** into the `.policy`; a test asserts both.

## What this slice contains

Seven Guardian `customLogicBlock` calculations covering eight baseline
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

All eight were read directly from the rendered PDF. Equations (3)–(8) and (11)–(12)
were confirmed against the page during the pre-commit verification pass, with page
labels from the document's own furniture.

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
| Appendix 2 Eq (48) fuel emission factor conversion | Eqs (40)/(41) net reductions and removals |
| One Verra Project Hub CUSTOM mapping, scope 14 | §8.5 uncertainty, §8.6 VCU calculation, VT0001 additionality |
| | Appendix 1 Eq (47) — deferred, see below |

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

## Deferred: Appendix 1, Eq (47) (CH4 / N2O)

**Eq (47) is deferred and is not implemented in this slice.** An earlier draft
contained `logic/calculate-non-co2-emission-factor.js`,
`schemas/non-co2-emission-factor.schema.json` and
`test/calculate-non-co2-emission-factor.test.mjs`; all three were removed on
ruling, together with their entries in `policy.config.json`, `build-policy.mjs`,
`schemas/project-description.schema.json` and this document. The `nonCo2Gases`
input block was also removed, so no CH4/N2O data is collected or emitted today.

Constraints that would apply if that scope were ever authorised:

1. **Emission-factor assumptions must be explicitly enforced and tested.**
   Appendix 1 states no numeric GWP values, so the applicable GWP set (VCS,
   IPCC) must be pinned rather than assumed.
2. `EF_FUEL-GHG` carries CO2, CH4 and N2O as three distinct outcomes. A
   tCO2e-labelled total must not silently absorb a non-CO2 factor — see
   `PROVENANCE.md` §4 item 5.

## Verification

```
node build-policy.mjs
node --test test/*.test.mjs
```

Build is deterministic: repeated runs produce a byte-identical `VM0010.policy`
(SHA-256 verified). Suite result at the time of writing: **103 tests, 102 pass,
0 fail, 1 skipped.** The skip is the AJV cross-check in
`test/schema-validation.test.mjs`; AJV is declared in the repository but is not
installed, and installing dependencies is out of scope. Primary validation runs
through the dependency-free validator in `test/_schema-validator.mjs`.

Zero-install is a deliberate constraint of this slice, not an oversight.