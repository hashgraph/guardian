# VMR0017 / ACM0002 — Grid-Connected Renewable Energy dMRV

**Team:** Bikram786
**Repository:** [Hedera Hydropower dMRV (5-layer verification)](https://github.com/BikramBiswas786/Hedera-hydropower-dMRV-with-5-layer-verification-/tree/main)
**Submission:** Hedera Guardian policy for VMR0017 / ACM0002 — grid-connected electricity generation from renewable sources (hydropower focus).

---

## Overview

A Hedera Guardian digital MRV policy digitizing **CDM ACM0002 v22.0** as revised by **Verra VMR0017 v1.0**, for grid-connected renewable electricity generation with a hydropower focus. It implements the full crediting workflow — project description, monitoring report, multi-role verification, automated emission-reduction calculation, and VCU minting — with schemas transcribed from the VCS v5.0B templates and the VMR0017 / ACM0002 methodology.

---

## What's in the policy (verified contents)

**58 schemas**, all with complete field descriptions, organized as:

| Category | Count | Examples |
|---|---|---|
| VCS PD/MR template sections | 9 | 1.1 Summary Description, 3.5 Additionality, 5.4 Ex-Ante vs Achieved Reconciliation |
| Data/Parameter schemas (one per methodology parameter) | 21 | EF_Res, EF_embodied, EG_PJ,y, EF_OM / EF_BM, M_e,released,y, TEG_y, geothermal steam fractions |
| Core workflow & safeguard schemas | 28 | Project Description, Monitoring Report, Stakeholder Engagement Plan, ESG Risk Assessment, VVB Profile, Grievance Log, technical records |

**566 blocks**, including a 5-mathBlock calculation engine and the token-mint chain.

> **Note on schema count:** this policy contains **58 schemas**. Each is a distinct, description-complete schema — no placeholder shells, no duplicated "operational sections." If a larger figure appears elsewhere, 58 is the count that matches this file.

---

## Methodology implementation

Faithful to VMR0017 v1.0 (which must be used with ACM0002 v22.0):

- **Baseline emissions:** `BE_y = EG_PJ,y × EF_grid,CM,y` (ACM0002 Eq.11), with the combined-margin grid emission factor (VT0011 replacing TOOL07).
- **Project emissions:** the 6-term VMR0017 equation `PE_y = PE_FF + PE_GP + PE_HP + PE_BESS + PE_PSP + PE_FSS`, including the VMR0017-added **BESS fire-suppression term** (Eq.18) and **hydropower reservoir emissions** with power-density banding (ACM0002 Eq.7–10; EF_Res = 100 kg CO₂e/MWh per VMR0017 §9.1).
- **Leakage:** the VMR0017-added **embodied-emissions leakage** `LE_y = EG × EF_embodied × 10⁻³` (Eq.19/20; ACM0002 alone has no leakage term). Hydropower EF_embodied = 21 g CO₂e/kWh.
- **Net reductions:** `ER_y = BE_y − PE_y − LE_y` (VMR0017 Eq.17) — the value minted.
- **Tool swaps:** TOOL01→VT0008, TOOL02→VT0009, TOOL05→VT0010, TOOL07→VT0011; TOOL03 retained for fossil-fuel project emissions; TOOL32 removed.

---

## Calculation and minting

The math engine is a LaTeX / ComputeEngine (CortexJS 0.27.0) implementation. Design principles that make it business-usable:

- **Calculated fields are read-only and engine-filled.** BE_y, PE_y, LE_y, ER_y, power density, and combined-margin EF are never entered by a user — the engine computes them. `ER_y` (field27) is what the mint block reads.
- **Input fields carry a default of 0**, so a project that lacks a given component (no BESS, no geothermal, no fossil co-firing) can leave those fields blank and the math still resolves cleanly instead of failing.
- **Required inputs** cover the fields every project must disclose (grid emission factors, net electricity to the grid, and the technology-declaration flags); conditional technology-specific inputs are optional but defaulted.
- **Engine output is signed**, preserving the issuer DID through the calculation so the report can publish to Hedera.

**Verified behaviour** (against the calculation engine, offline): with real hydro inputs (e.g. 50 GWh/yr to grid and a representative grid emission factor), the engine computes a positive numeric `ER_y`, which the mint block issues as VCUs.

---

## Verification workflow

Multi-role governance following the standard VM0047 pattern: Project Proponent submits the Project Description and Monitoring Reports → VVB verifies → Standard Registry approves → tokens mint. Includes stakeholder-engagement, grievance, and ESG-safeguard schemas required under VCS v5.0.

---

## Status and known limitations

- **Schema coverage:** the 58 schemas cover the core PD/MR sections, all key methodology parameters, and the required safeguards. A complete 1-to-1 transcription of *every* VCS v5.0B PD section (≈37) and MR section (≈32) is not yet finished; the SEP, ESG, and VT-tool sub-schemas are represented at the section level rather than fully decomposed. The authoritative template blueprints are available, and further sections can be transcribed from them.
- **Testing:** validated for schema structure and calculation correctness offline (against Guardian's math engine and schema format). Full import and end-to-end minting should be confirmed in a live Guardian instance.
- **Tool internals:** VT0008 / VT0009 / VT0010 / VT0011 are represented by the parameters they produce (taken as monitored/validation inputs); their internal step procedures are documented in the methodology narrative rather than as separate computational blocks.

---

## Files

- **Policy file:** [VMR0017 Grid-Connected Renewable Electricity Generation (ACM0002 Revision, incl. Hydropower).policy](https://github.com/BikramBiswas786/Hedera-hydropower-dMRV-with-5-layer-verification-/blob/main/Apex%20Hackathon26/VMR0017%20Grid-Connected%20Renewable%20Electricity%20Generation%20(ACM0002%20Revision%2C%20incl.%20Hydropower)_1785008700176_1785009452793_1785180341990_1786834536231_1786908281195_1786957864810_1786970853091_1786992168711_178%20(3).policy)
- **Schema mapping (Excel):** [policy_1787055470479.xlsx](https://github.com/BikramBiswas786/Hedera-hydropower-dMRV-with-5-layer-verification-/blob/main/Apex%20Hackathon26/policy_1787055470479.xlsx)

---

*All figures in this document (58 schemas, 566 blocks, 5 mathBlocks) reflect the actual contents of the policy bundle.*
