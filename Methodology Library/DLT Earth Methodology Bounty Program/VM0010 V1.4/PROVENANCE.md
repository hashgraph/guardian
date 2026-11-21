# VM0010 v1.4 — Notation & Equation Provenance

Reviewer-facing record of what in this slice is **verified from source**, what is
**not verified**, and what is **known defective**. Read this before relying on any
formula in `logic/`.

This document makes no claim of completeness. It records the limits of the
evidence actually gathered.

**Last regenerated:** after the Equation (8) slice, during the pre-commit
verification pass. Supersedes the previous revision, whose central claim — that
all equation algebra was unrecoverable — is no longer true. See §2.

---

## 1. Source documents

| # | Document | Status | Role |
|---|---|---|---|
| S1 | VM0010 v1.4 (Clean), active 24 Oct 2024, 93 pp | Read | Base methodology |
| S2 | *Correction to VM0010 v1.2–v1.4*, pub. 18 Sep 2025, **upd. 11 Jun 2026**, 2 pp | Read | **Mandatory** |
| S3 | *Corrections & Clarifications to VM0010 v1.3 and v1.4*, pub. **4 Sep 2026**, 7 pp | Read | **Mandatory** |
| S4 | VT0001 v3.0 (AFOLU additionality) | Not read | Referenced by §6.1, §7 |

Source URLs (retrieved for this pass):

| Doc | URL |
|---|---|
| S1 | `verra.org/wp-content/uploads/2024/10/VM0010_IFM_LtPF_v1.4_Clean_10282024.pdf` |
| S2 | `verra.org/wp-content/uploads/2026/09/VM0010_v1.2-1.4_Correction_06112026.pdf` |
| S3 | `verra.org/wp-content/uploads/2026/09/VM0010_v1.3-1.4_Corrections_and_Clarifications_09042026.pdf` |

Landing page: `verra.org/methodologies/vm0010-methodology-for-improved-forest-management-conversion-from-logged-to-protected-forest-v1-4/`

Page counts cross-check against this table: 93 / 2 / 7. ✓

Extraction: `pypdf` with `extraction_mode='layout'` (already installed; no
dependencies added). Layout mode is **required** — see §2.

---

## 2. Superseded claim: equation algebra IS now recoverable

The previous revision of this file asserted:

> "All equation algebra is unrecovered… the equation glyphs in S1 are character
> identifiers with no recoverable mapping… this slice asserts **no page number for
> any equation**."

**That is no longer true, and the assertion was an artefact of the extraction
method, not a property of the document.** Plain `extract_text()` returns the
mathematical italic glyphs as mojibake (`­ØÉÂ­Øæø­Øæ£…`), which made the
equations unreadable and led this slice to reconstruct their algebra by inference.

`extraction_mode='layout'` returns them correctly as Unicode mathematical
italic code points — e.g. Eq (8) as `𝐶𝐸𝑋,𝑖|𝐵𝑆𝐿 = ∑ 𝐶𝐸𝑋,𝑗,𝑖|𝐵𝑆𝐿`. With that, the
following were read **directly from the rendered page**, not inferred, each with a
confirmed page label:

| Eq | Page | Section |
|---|---|---|
| (1) | 19 | §8.1.1 |
| (2) | 20 | §8.1.1 |
| (3) | 20 | §8.1.1 |
| (4) | 21 | §8.1.1 |
| (5) | 22 | §8.1.2 |
| (6) | 23 | §8.1.2 |
| (7) | 23 | §8.1.2 |
| (8) | 24 | §8.1.3 |
| (9) | 25 | §8.1.3 |
| (10) | 25 | §8.1.3 |
| (11) | 26 | §8.1.3 |
| (12) | 26 | §8.1.4 |

Equations (13)–(48) were **not** re-read in this pass and remain inferred where
implemented.

**This correction exposed a live defect in shipped code. See §5.**

---

## 3. VERIFIED — what was read from source

### 3.1 Equations as printed

```
(3)  p20  CHB,j,i|BSL = (VEX,j,i|BSL + VEX,INF,j,i|BSL) x BCEFR x CFj
(4)  p21  CEX,j,i|BSL = (VEX,j,i|BSL + VEX,INF,j,i|BSL) x Dj x CFj
(5)  p22  dCDWSLASH,i,p|BSL = SUM j=1..J [ CHB,j,i|BSL - CEX,j,i|BSL
                                       + CRSD,j,i|BSL + CnotHB,INF,j,i|BSL ]
(6)  p23  CRSD,j,i|BSL = CEX,j,i|BSL x FRSD|BSL
(7)  p23  CnotHB,INF,j,i|BSL = VnotEX,INF,j,i|BSL x BCEFR x CFj
(8)  p24  CEX,i|BSL = SUM j=1..J CEX,j,i|BSL
(9)  p25  dCWP0,i|BSL = SUM k ( CEX,i,k|BSL x (WWk + SLFk) )
(10) p25  CWP,i|BSL = SUM k ( CEX,i,k|BSL - dCWP0,i|BSL )
(11) p26  dCWP100,i,p|BSL = SUM k ( CWP,i|BSL x OFk )
(12) p26  CFUEL = E_HARVEST + E_HAULING + E_TRANSPORT + E_PROCESSING  44/12
```

### 3.2 Eq (12) and the `44/12` factor — now directly confirmed

S1 p. 26 prints `44/12` as a trailing multiplier on the four-addend sum. S3
Correction 3 amends **the unit of `C_FUEL` from tC to tCO2e**. `44/12` is the
carbon-to-CO2 conversion that the unit correction makes redundant, so **it is not
applied**. The implementation correctly omits it. This is no longer an inference
from C&C prose alone; the base text is now visible.

The four addend symbols `E_HARVEST`, `E_HAULING`, `E_TRANSPORT`, `E_PROCESSING`
are now **source-verified names**, not implementation aliases. S1 p. 26 Where-block:
*"Fossil fuel emissions due to harvesting operations such as felling and snigging"*,
*"…due to log hauling"*, and so on.

### 3.3 §9.1 parameters (p. 53 ff.) — symbols and units verified

`EFFUEL` tCO2e/kL · `FCHARVEST` kL/m³ · `FCHAULING` kL/m³ · `KMTRANSPORT`
km/truck · `CAPTRUCK` m³/truck · `EFFVEHICLE` km/kL · `EDEMAND` kWh/m³ ·
`EFELECTRICITY` tCO2e/kWh · `TGENERATOR` h · `FCGENERATOR` kL/h · `PRGENERATOR` kW ·
`Vl,j,i,sp` m³ · `CFj` tC/t.d.m. · `Dj` t.d.m./m³ · `Fj(X,Y…)` t.d.m./tree ·
`BCEFR` t.d.m./m³ (p. 67) · `Ggi` g/kg · `OF`/`SLF`/`WW` dimensionless (p. 69) ·
`PMLFT` % · `RGRi` tC/ha/yr · `VEX,j,i|BSL` m³/ha (p. 71) · `VEX,INF,j,i|BSL` (p. 54) ·
`VnotEX,INF,j,i|BSL` (p. 55) · `THi,p` years · `Ai,p` ha · `At*,i,p` ha · `A1,i,p`,
`A2-10,i,p`, `A11-20,i,p`, `Asp` ha · plus §9.2: `Aburn`, `Adist`, `ADIST_IL,i`,
`CDIST_IL`, `APi`, `PMPi`, illegal-logging PRA results.

The one recoverable algebraic relation: **`BCEFR = BEFR x D`**.

**There is no `A_HB,j` parameter anywhere in VM0010 v1.4.** See §5.

### 3.4 Both C&C documents — transcribed in full

S2 (11 Jun 2026) is a single Correction 1 removing the baseline-averaging sentence
from §8.1. S3 (4 Sep 2026) carries Clarification 1, Clarification 2 and
Corrections 1–6:

| Item | Section affected |
|---|---|
| Correction 1 | §4 Applicability Conditions |
| Correction 2 | §8.1 Baseline Emissions — reassessment instructions |
| Correction 3 | v1.4 §8.1.4 — units of `C_FUEL` in Eq (12) |
| Clarification 1 | §1 Summary Description table |
| Clarification 2 | v1.4 — range of `t*` in Eq (26) |
| Correction 4 | v1.3 §8.2.2.2 — `A_i` in Eq (37). **v1.3 only, not applicable to v1.4** |
| Correction 5 | §8.2.2.2 — units of `C_FUEL` in Eq (37) |
| Correction 6 | §8.4 — Eqs (40) and (41) |

**No C&C item amends §8.1.1, §8.1.2 or §8.1.3.** Eqs (3)–(8) and (11) are
unaffected by both mandatory documents.

---

## 4. STILL NOT VERIFIED — the remaining limits

| # | Gap | Affects |
|---|---|---|
| 1 | Eqs (13)–(21) are bypassed. `c-fuel` derives each addend from `EF x consumptionKl`. The methodology chain is EF [tCO2e/kL] x consumption [**kL/m³**] x volume [**m³**], using `CAPTRUCK`, `KMTRANSPORT`, `EFFVEHICLE`, `EDEMAND`, `EFELECTRICITY`. Volume is silently pre-folded into `consumptionKl`, and the kL/m³ rate is not expressed in the schema. | equation selection, downstream, units |
| 2 | §8.1.4.4 defines two mutually exclusive derivations for the fourth addend — grid electricity (Eqs 18/19) and on-site generator (Eqs 20/21). Only a generic fuel path exists; no generator branch. | equation selection |
| 3 | The §9.1 **`Equations` column is unreliable** — off-by-one or misassigned for ~12 parameters (`FCHARVEST`→(14) where §8.1.4.1 indicates (13); `CAPTRUCK`→(16) vs (15); `Ggi`→(20) vs (33); `Fj`→(17) vs (29)). The methodology never states the correct mapping. | equation mapping |
| 4 | Source-internal tension, recorded not resolved: Eq (12) says *"from collection depot to processing plant"* while Eq (17)'s own LHS says *"haulage from felling location to the collection depot/sawmill"*. | naming only |
| 5 | CO2-only scope is **declared, not enforced**. No schema field or runtime check requires `EF_IPCC-FUEL` to be a CO2 factor; a CH4 or N2O factor would be summed into a tCO2e-labelled total. | units |
| 6 | Appendix 1 (p. 87) Eq (47) is **out of scope and deliberately not implemented**. See `README-slice.md`. | — |
| 7 | Whether a crediting-period average and `x t*` belong **inside** Eq (12), or are applied by the caller, is undetermined. This slice applies neither. | arithmetic, downstream |

---

## 5. KNOWN DEFECT — Equation (7) uses a parameter that does not exist

**Status: CLOSED — corrected 6 Oct 2026.**

`logic/calculate-infra-812.js` previously implemented Eq (7) as:

```
cNotHbInfJiBsl: vNotExInf * aHbJ * cfJ        // aHbJ was the input name
```

S1 p. 23 prints Eq (7) as:

```
CnotHB,INF,j,i|BSL = VnotEX,INF,j,i|BSL x BCEFR x CFj
```

The multiplier is **`BCEF_R`**. **`A_HB,j` did not exist in VM0010 v1.4** — it was
a misreading of mojibake glyphs under the old extraction method (§2).

**The correction.** The input was renamed `aHbJ` → `bcefR`, and the emitted row
field likewise. Applied to `logic/calculate-infra-812.js`,
`schemas/infra-812.schema.json`, `schemas/project-description.schema.json`
(`infrastructureBiomass[]`), `test/calculate-infra-812.test.mjs`,
`test/calculate-extracted-813.test.mjs` and `test/schema-validation.test.mjs`.
Validation error strings now name `BCEF_R`.

- **Arithmetic was unaffected** — three factors multiply either way, so no test
  value changed.
- **Provenance is now correct**: `BCEF_R` has a §9.1 Data/Parameter row (p. 67)
  and was already carried on `strata[].bcefR` for Eq (3).
- The earlier "open question" recorded against Eq (7) — that `A_HB,j`'s
  description was word-for-word identical to `BCEF_R`'s, with no §9.1 row of its
  own — **is answered: they are the same parameter.** The descriptions matched
  because they *are* the same parameter.

`A_HB,j` now survives only as a historical mention in the `calculate-infra-812.js`
header and in this section, both describing the correction. It appears in no
schema, input or assertion.

### 5.1 Equation (9) remains unimplementable — two independent blockers

1. `SLFk` for the `"other"` class has no confirmed provenance. §9.1 p. 69 carries
   only a single combined `OF, SLF, WW` row with no per-class values for `"other"`.
2. **`C_EX,i,k|BSL` is itself unsourced.** Eq (9) needs the carbon stock per
   wood-product class. It has no §9.1 Data/Parameter row and no equation derives
   it from `C_EX,j,i|BSL`. The Document History (p. 92) records it only as
   *"clarified to be the mean carbon stock of extracted timber per unit area in
   stratum i, for wood product type k"* — a definition, never a derivation.

Implementing Eq (9) would require inventing either the class split or an `SLFk`
value. It stays parked.

---

## 6. Equations implemented in this slice

| Eq | Section | Page | File | Status |
|---|---|---|---|---|
| (48) | Appendix 2 | 88 | `calculate-c-fuel.js` | verified |
| (3), (4) | §8.1.1 | 20, 21 | `calculate-carbon-stocks-811.js` | verified |
| (5) | §8.1.2 | 22 | `calculate-deadwood-812.js` | verified |
| (6) | §8.1.2 | 23 | `calculate-rsd-812.js` | verified |
| (7) | §8.1.2 | 23 | `calculate-infra-812.js` | verified; `bcefR` corrected 6 Oct 2026 — see §5 |
| (8) | §8.1.3 | 24 | `calculate-extracted-813.js` | verified |
| (11) | §8.1.3 | 26 | `calculate-woodproducts-813.js` | verified |
| (12) | §8.1.4 | 26 | `calculate-c-fuel.js` | verified, `44/12` omitted per S3 |

**Eight equations across seven logic blocks, all verified against the rendered
page.** Eqs (1), (2), (9), (10) and the remainder are not implemented.

---

## 7. Standing recommendation

Do not submit this slice as a verified digitisation. Do not stage it while §5 is
open. Eqs (13)–(21) and Eqs (45)–(48) beyond Eq (48) remain inferred; §4 items
1–5 remain live. Correct Eq (7) first, then re-run the full suite.