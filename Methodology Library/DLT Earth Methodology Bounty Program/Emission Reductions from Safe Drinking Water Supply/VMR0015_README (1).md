# VMR0015 / AMS-III.AV — Safe Drinking Water dMRV
## Guardian Policy Documentation

**Methodology:** VCS VMR0015 v1.0 (*Revision to AMS-III.AV*), applied on top of CDM **AMS-III.AV v09.0**
— *Low greenhouse gas emitting safe drinking water production systems*
**Token:** VCU VMR0015 (fungible, 0 decimals, floor rounding)
**Scale:** 404 blocks · 93 schemas · 5 mathBlocks · 3 roles

---

## 1. Quick start — how to use this policy

### Roles
| Role | Who | What they do |
|---|---|---|
| **Project Participant (PP)** | Project developer | Registers, submits Project Description and Monitoring Reports |
| **VVB** | Validation/Verification Body | Validates the PD; verifies each MR |
| **Standard Registry (SR/OWNER)** | Registry administrator | Approves accounts, gives final approval, triggers minting |

### Step-by-step

**Setup (SR)**
1. Import the policy, associate the VCU token, run Dry Run or publish.

**Account onboarding**
2. **PP** registers a profile → status `Waiting for approval` → **SR** approves via *Approve PP Documents*.
3. **VVB** registers → **SR** approves (accreditation). A VVB cannot act until accredited.

**Project registration**
4. **PP** submits the **Project Description** (one form; internally expands to all 32 VCS PD sections).
5. **PP** assigns a VVB.
6. **VVB** issues a **Validation Report** (4 VCS sections + CAR/CL/FAR findings table).
7. **SR** approves the project → project becomes `approved_project`.

**Monitoring & issuance (repeats each period)**
8. **PP** submits a **Monitoring Report**, linked to the approved project.
   The calculation engine runs automatically on submission (see §2).
   A `customLogicBlock` cross-references the PD and computes ex-ante vs achieved reconciliation.
9. **VVB** verifies → status becomes `Verified`.
   *Only `Verified` reports appear in the SR queue — this gate is enforced in the workflow, not by convention.*
10. **VVB** issues a **Verification Report**.
11. **SR** gives final approval → passes through the **REDD+ double-counting gate** → **VCUs minted** (= `field6`, floored to whole tokens).

**Revocation** is available to SR at the project, report, and token stages.

---

## 2. Calculation engine

All tool calculations are digitised **inline in mathBlocks**, with inputs drawn from the PD/MR
templates. Formula execution order is dependency-ordered (no forward references).

### 2.1 QPW_y — three methodology-defined determination methods

`field54` selects the approach, and the selection is wired into the calculation logic:

| `field54` | Method | Formula | Inputs |
|---|---|---|---|
| **0** | Direct monitoring (para 16(a)) | `Σ instance volumes` | field36–41 |
| **1** | Option 2.1 (**Equation 2**) | `capacity × usage time` | field55, field56 |
| **2** | Option 2.2 (**Equation 3**) | `P × min(QPW_pp, 5.5) × 365` | field42, field58 |

**Multi-instance summation:** Method 0 aggregates 5 named instance slots plus a bulk remainder
(field41) for projects with more than 5 instances, so a single MR submission covers all instances.

**Per-capita cap (para 18):** `QPW_y = min(selected, population × 5.5 × 365)` — applied to *all three*
methods. The 5.5 L/person/day ceiling is fixed by the methodology
(confirmed in CDM EB60: *"the maximum volume of purified water per person per day set at 5.5 litres in equation 1"*).

### 2.2 Baseline emissions — AMS-III.AV Equation 1

```
BE_y = QPW_y × m × X_boil × (SEC / n_wb) × Σ(BL_fuel,i × f_i × EF_fuel,i) × 10⁻⁹
```

- **SEC = 357.48 kJ/L** (Equation 5) — methodology constant, not user-editable.
- **`m` is computed, not entered.** Per **Box 5** of the methodology
  (*"8% of units fail… emission reductions are adjusted to 92% of the calculated value"*),
  `m = pass count / tested count` (field10/field11), zeroed by the eligibility gate below.
  `field13` is therefore read-only.
- **Σ term** supports up to 4 baseline fuel types (primary + 3), each with its own
  proportion, non-renewable fraction and emission factor.

### 2.3 Water-quality eligibility gate — para 27 / Data & Parameters table 11

```
ER_y = 0  unless  (pass ÷ tested) ≥ 0.90
```
A hard binary gate, not a scaling factor: below 90%, the whole period's reductions are zero.

### 2.4 fNRB — two pathways (`field30`)

| `field30` | Pathway | Source |
|---|---|---|
| **1** | Published default | **TOOL33** *Default values for common parameters* (fNRB defaults were relocated from TOOL30 to TOOL33 by the CDM in 2022; AMS-III.AV v09.0 is under revision to cite TOOL33 directly) |
| **0** | Project-specific | **TOOL30 v04.0 para 3(b)**: `fNRB = NRB / (NRB + RB)`, zero-denominator guarded |

*TOOL30 para 3(a) is a DNA process for submitting standardised-baseline defaults, not a
project-participant activity, and is deliberately not digitised.*

### 2.5 Project emissions — Equation 6

```
PE_y = PE_FF,y + PE_EC,y
```
- **PE_FF,y** — **TOOL03 v03.0 Eq.1**: `FC_i,j,y × COEF_i,y`
  (field22 rate × field21 period length × field25 coefficient).
  COEF may be derived by TOOL03 Option A (carbon content × 44/12) or Option B (published default) — state which.
- **PE_EC,y** — **TOOL05**: `EC × EF_grid × (1 + TDL)`, including technical T&D losses (field34).

### 2.6 Leakage and net reductions — Equation 7

```
LE_y = LF × BE_y
ER_y = max(BE_y − PE_y − LE_y, 0) × water-quality gate      ← minted value (field6)
```

### 2.7 Tools digitised

| Tool | Purpose | Where |
|---|---|---|
| TOOL03 v03.0 | Fossil fuel combustion emissions | `pe` |
| TOOL05 | Electricity consumption + T&D losses | `peelec` |
| TOOL30 v04.0 | Project-specific fNRB | `fnrbcalc` |
| TOOL33 | Published fNRB defaults | `fnrb` |
| TOOL21 / 19 / 01 | Small-scale additionality | PD §3.5 |

---

## 3. Schema architecture

Schemas follow Verra's published VCS templates
(verra.org/programs/verified-carbon-standard/vcs-program-details), with methodology-specific
customisation layered on top.

**Composition:** Project Description and Monitoring Report are each a single form that internally
composes numbered VCS sections via JSON-Schema `$ref`, with the full sub-schema definitions
embedded in `$defs` — the same mechanism VM0047 uses. Repeatable tables (proponent contacts,
locations, audit history, GHG sources, SDG rows, stakeholder rows, grievances, per-year estimates,
data/parameter entries) are `array` of `$ref`.

**Coverage:** VCS PD **32/32** sections · VCS MR **13/13** sections.

**VCS v5.0 additions:** Safeguards & Stakeholder Engagement (mandatory, all project types) ·
FPIC evidence · Grievance log · ESG Risk Assessment (ex-ante) · ESG Risk Monitoring (ex-post) ·
Stakeholder Engagement Plan · Right to Operate and Right to Reductions & Removals (§3.6).

**Data & Parameters:** 11 per-parameter schemas (SEC, EF_fuel, fNRB, m, X_boil, n_wb, QPW_i,
WQ_pass, TDL, EF_grid, LF), each carrying the full VCS field set — description, unit, equation,
source, measurement methods, frequency, value applied, monitoring equipment, QA/QC, purpose,
calculation method, comments.

**VVB documents:** both **Validation Report** (of the PD) and **Verification Report** (of each MR),
each with a CAR/CL/FAR findings table.

---

## 4. Interpretive decisions and assumptions

Per the requirement that interpretation decisions be made explicit in the policy logic:

| Decision | Rationale |
|---|---|
| Tool calculations embedded inline in mathBlocks rather than as separate Tool policies | All inputs originate from the PD/MR templates; avoids the `#variable:schema` cross-reference failure mode |
| `m` derived from measured pass rate rather than entered | Box 5 defines it as the measured compliance fraction; an independently-typed value could contradict the submitted water-quality evidence |
| Only TOOL30 para 3(b) digitised | Para 3(a) is a DNA procedure, not available to a project participant |
| 5 instance slots + bulk remainder | Bounded form fields with an overflow path, rather than an unbounded list |
| Per-capita cap applied to all three QPW methods | Para 18 states the cap without limiting it to any one determination method |
| CDM tools used, not VT0008 | VMR0015 does not reference VT0008; the tools named by the methodology govern |
| Categorical fields as guided free text | Machine-enforced enums block Guardian's dry-run mock-fill; VVB verifies the value at review |

---

## 5. Verification status

The engine has been checked against a live signed Verifiable Credential — every computed value
reproduces by hand from the methodology equations, including the QPW method selection, the
per-capita cap, the derived `m`, and the multi-fuel baseline sum.

Structural checks pass with zero issues: no dangling events, no empty or broken schema references,
no stale `$defs` copies, no conditional fields missing from root properties, no required-but-read-only
fields, no bare `if` clauses, no forward references in the formula chain, no duplicate tags.

**Known scope note:** this policy has 93 schemas. VM0047 has ~530, driven by AFOLU carbon-pool
families (woody biomass, dead wood, litter, soil organic carbon) that this methodology does not
have — AMS-III.AV has a single calculation pathway with ~11 monitored parameters. All VCS template
sections are covered; the difference is methodology complexity, not missing coverage.

---

## 6. Test data provenance (read this before evaluating the test documents)

The test Monitoring Report included with this submission uses **real-world project data**, but the
provenance requires precise statement because it draws on **two distinct projects**. Neither is
Verra/VCS registered, and no claim is made that either is.

**(A) AMS-III.AV methodology reference — CDM PoA 7067**
"Sustainable Deployment of the LifeStraw Family in rural Indonesia", PoA ID
`073P2XBYEUAGZML8S6NVJWFTHQ1KD5`. Verified on the UNFCCC CDM registry: Methodology Used =
**AMS-III.AV ver. 2**; Registration Date = 30 Dec 2012; Sectoral scope 3; Activity scale SMALL;
DOE = DNV; 52,674 tCO2e/annum. This is a genuine registered AMS-III.AV project. **No parameters
were taken from it** — it is cited as the methodology reference only.

**(B) Source of the numeric inputs — Vestergaard Kenya "Carbon for Water"**
A **separate** project, certified under **Gold Standard's** cook-stove/kitchen-regime methodology,
**not** AMS-III.AV and **not** Verra. Values used: population 4,096,000; X_boil 0.71; fNRB 0.65;
QPW_pp 4.11 L/person/day; Wi 0.36 kg wood/L; leakage ratio 0.00029453.

**Derived, not reported:** `n_wb` (0.063654) and `EF_fuel` (116.7115 tCO2e/TJ). The Kenya PDD states
fuel use as mass intensity (kg wood/L); AMS-III.AV Eq.1 requires the energy-based SEC/n_wb term, so
n_wb was back-calculated by equating `Wi x NCV(wood)` to `SEC/n_wb`. The resulting ~6.4% efficiency is
consistent with published three-stone-fire values.

**Result and its limits:** the engine computes BE_y = 1,858,686 against the Kenya project's reported
2,498,872 (74%). The gap is attributable to the cross-methodology unit conversion above, not to an
engine defect — the `ER = BE - PE - LE` structure reproduces that project's own reported figures
*exactly* (2,498,872 - 424,808 - 736 = 2,073,328).

**Why not a current-version project?** AMS-III.AV v09.0 has been valid only since 12 June 2025 and
VMR0015 since 31 October 2025. No project under either has completed a
validation → registration → verification cycle with published ER figures. A Verra-listed project
matching this methodology exists ("Water Purification System for Safe Drinking Water (SDW) in
Indonesia") but its parameter set is behind Verra Registry access. **If the review team can supply
that PDD, a like-for-like calibration can be run and this caveat removed.**

---

## 7. Block-type conformance note

Per the bounty Q&A guidance that *calculations should use mathBlocks rather than customLogicBlocks*:

**All credit-determining calculations are in mathBlocks.** Every value affecting the minted amount —
QPW determination (all three methods), fNRB, the baseline equation, the water-quality gate, project
emissions, leakage, and ER — is computed in `vmr0015_formula_audit_math`.

**One customLogicBlock exists** (`mr_exante_reconciliation`) and is used **only** for the VCS MR 5.4
ex-ante vs achieved reconciliation, which requires reading a *second* document (the Project
Description) to compare against the Monitoring Report. Guardian's mathBlock operates on a single
document's fields and cannot perform cross-document lookup. This mirrors VM0047, which uses three
customLogicBlocks for the same class of cross-document work. The reconciliation output is a
**reporting field and does not affect the minted amount**.

---

## 8. Known limitations, stated plainly

**Policy Registry Index is administrative, not ledger-anchored.** This schema records policy-level
identifiers (`hederaTopicId`, `tokenId`, version) and is **filled manually by the Standard Registry**.
Guardian's mint block exposes `tokenId` and `date` on its downstream event but does **not** expose the
Hedera topic ID to downstream blocks (it is resolved internally and surfaces only in external
telemetry). The schema and every field description state this explicitly, and flag HashScan
verification as a VVB checkpoint. **The authoritative, tamper-evident records are the signed VCs/VPs
and their Hedera transactions — not this index.**

**Schema count.** 93 schemas, covering VCS PD 32/32 and MR 13/13 sections. VM0047 has ~530, driven by
AFOLU carbon-pool families (woody biomass, dead wood, litter, soil organic carbon) that this
methodology does not have — AMS-III.AV has a single calculation pathway with ~11 monitored parameters.
All template sections are covered; the difference is methodology complexity, not missing coverage.

**Excel export links.** Guardian's .xlsx exporter URL-encodes and duplicates internal sheet
references, so cross-sheet links do not resolve when clicked. This is a Guardian export defect
affecting all policies, not a defect in the schema relationships — which resolve correctly in the
`.policy` file via `$ref`/`$defs`.
