# VM0046 DMRV System Description

**Digital Measurement, Reporting and Verification (DMRV) Implementation of VCS Methodology VM0046**

---

| Document Property | Value |
|---|---|
| **Document Title** | VM0046 DMRV System Description |
| **Methodology** | VM0046 v1.0 — Methodology for Reducing Food Loss and Waste |
| **Methodology Approval Date** | 12 July 2023 (Verra Sectoral Scope 13) |
| **DMRV Platform** | Hedera Guardian v3.5.0 |
| **Distributed Ledger** | Hedera Hashgraph (Testnet for development; Mainnet for production) |
| **Document Version** | 1.0 |
| **Document Date** | 28 April 2026 |
| **Submission Type** | Verra Methodology Digitization |

---

## 1. Executive Summary

This document describes the digital Measurement, Reporting and Verification (DMRV) implementation of Verra Carbon Standard methodology **VM0046 — Reducing Food Loss and Waste, version 1.0** (approved by Verra on 12 July 2023, Sectoral Scope 13: Waste Handling and Disposal).

The DMRV system is built on **Hedera Guardian**, an open-source policy workflow engine developed by Hedera Council and Envision Blockchain Solutions, running on the **Hedera Hashgraph** distributed ledger. The implementation replaces traditional spreadsheet-based VCS workflows with a fully automated, auditable, blockchain-anchored alternative that:

- Automates all 14 calculation equations specified in VM0046 Section 8
- Validates input parameters against VM0046 applicability conditions
- Enforces mass balance, boundary inclusion logic, and conditional leakage rules
- Issues Verified Carbon Units (VCUs) on Hedera as fungible tokens, with full audit trail back to project documentation, validation reports, monitoring reports, and verification reports
- Provides Project Proponents (PPs), Validation/Verification Bodies (VVBs), and Verra (program owner) with role-based interfaces enforcing VCS Standard v4.4 separation of duties

This implementation maintains 100% conformance with VM0046 v1.0 calculation procedures and integrates with VCS Standard v4.4 templates for Project Description (PD), Monitoring Report (MR), Validation Report, and Verification Report.

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Layer (Browser)                      │
│  Project Proponent  │  VVB Auditor  │  Verra Owner          │
└──────────┬──────────────────┬──────────────────┬────────────┘
           │                  │                   │
           ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Guardian UI (Angular SPA)                       │
│  PDD Forms │ MR Forms │ Validation/Verification Reports     │
└──────────┬───────────────────────────────────────────────────┘
           │ REST API + WebSocket
           ▼
┌─────────────────────────────────────────────────────────────┐
│              Guardian Policy Engine (Node.js)                │
│  • Workflow orchestration (216 blocks)                       │
│  • Schema validation (88 schemas)                            │
│  • JavaScript calculation engine (37k+ chars total JS)       │
│  • Role-based permission enforcement                         │
└──────┬──────────────────┬─────────────────┬─────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌────────────┐  ┌────────────────┐  ┌──────────────────────┐
│ MongoDB    │  │  Hedera        │  │  IPFS                │
│ (off-chain │  │  Hashgraph     │  │  (schemas, evidence  │
│  state)    │  │  (audit trail, │  │   docs, calculation  │
│            │  │  VCU minting)  │  │   workbooks)         │
└────────────┘  └────────────────┘  └──────────────────────┘
```

### 2.2 Component Roles

**User Layer**: Browser-based interaction. No special software required for any role.

**Guardian UI**: Renders dynamic forms generated from JSON schemas. Project Proponents complete PDD and MR forms; VVBs complete Validation Reports and Verification Reports; Verra Owner approves at appropriate workflow checkpoints.

**Guardian Policy Engine**:
- Orchestrates VCS workflow (PDD → Validation → MR → Verification → VCU issuance)
- Validates submitted documents against schemas (JSON Schema Draft 7)
- Executes JavaScript calculation engine on submission of PDD and MR
- Enforces role-based access control based on VCS Standard v4.4

**MongoDB**: Stores intermediate document state, enabling iterative completion before Hedera commit.

**Hedera Hashgraph**: Public, low-cost, energy-efficient DLT for:
- Verifiable Credentials (VCs) capturing PDD, MR, validation, verification artifacts
- HCS (Hedera Consensus Service) for ordered audit log
- HTS (Hedera Token Service) for VCU minting and transfer

**IPFS**: Off-chain storage for large artifacts:
- Schema definitions (with content-addressed CIDs in policy hash)
- Supporting evidence documents (HACCP certificates, audit reports, calculation workbooks)
- Enum value lists for forms (when value count is large)

### 2.3 Trust Chain

Each VCU minted by this system has a complete trust chain anchored on Hedera:

```
VCU Token (HTS)
  ↑ minted from
Verification Report VC (signed by VVB)
  ↑ verifies
Monitoring Report VC (signed by Project Proponent)
  ↑ which references
Validation Report VC (signed by VVB) and approved by Verra Owner
  ↑ validates
Project Description VC (signed by Project Proponent)
  ↑ which conforms to
VM0046 v1.0 Methodology Reference
```

Each Verifiable Credential is signed using Ed25519 by the issuing role's DID, and Hedera Consensus Service messages provide cryptographic ordering guarantees. Any auditor can independently reconstruct the chain by querying the Hedera mirror node and IPFS gateway.

---

## 3. VM0046 Methodology Coverage

### 3.1 Applicability Conditions (VM0046 Section 4)

VM0046 specifies five mandatory applicability conditions. The DMRV system enforces each via the schema `3.2 Applicability of Methodology`:

| # | Applicability Condition | Schema Field | Type |
|---|---|---|---|
| 1 | Project reduces FLW vs baseline | field0–field1 | Boolean + Justification |
| 2 | Activity introduces changes at food chain stage | field2–field3 | Boolean + Justification |
| 3 | Recovered food complies with food safety legislation | field4–field21 | Boolean + 16 structured evidence fields |
| 4 | Baseline destination is one of allowed FLW destinations | field22–field23 | Boolean + Enum |
| 5 | Project does NOT shift FLW between destinations | field24–field25 | Boolean + Justification |

**Condition 3 enhancement (Iteration 9)**: The schema includes 16 structured fields documenting food safety compliance:

- HACCP Certification (status, issuing body, certificate number, issue/expiry dates, IPFS document URL)
- Food Safety Regulator approval (authority name, approval reference, IPFS document URL, approval date)
- Recovery Program documentation (description, SOP IPFS URL, beneficiary organization, cold chain details)
- Third-party Audit (boolean + IPFS audit report URL)

This enforces verifiable compliance with VM0046 Applicability Condition 3 and the VCS Programme food safety provisions, providing VVBs with structured evidence for review.

### 3.2 Project Boundary (VM0046 Section 5)

The schema `3.3 Project Boundary` documents inclusion/exclusion of greenhouse gas sources:

| Field | GHG Source | VM0046 Default |
|---|---|---|
| Baseline CO2 from food at FLW destination | Biogenic CO2 | EXCLUDE (climate-neutral) |
| Baseline CH4 at FLW destination | Methane (dominant) | INCLUDE |
| Baseline N2O at FLW destination | Nitrous oxide | INCLUDE (conservative) |
| Baseline transport CO2 | Fossil fuel transport | INCLUDE |
| Project transport CO2 | Project transport fuel | INCLUDE |
| Project recovered food processing CO2 | Processing energy | INCLUDE |
| Project biogenic CO2 from food processing | Biogenic processing | EXCLUDE (climate-neutral) |
| Project CH4/N2O from food processing | Process emissions | Project-dependent |
| Project packaging/ingredients GHG | Material GHG | INCLUDE if applicable |

The JavaScript calculation engine reads these flags and applies them to the calculations. Specifically:

- If CH4 baseline is excluded → BE_j (Eq. 3/4/5 in VM0046) is set to 0 with a recorded warning
- A warning is generated when biogenic CO2 from food processing is INCLUDED, since VM0046 typically treats biogenic CO2 as climate-neutral

### 3.3 Baseline Scenario (VM0046 Section 6)

The schema `3.4 Baseline Scenario` captures:

- Baseline scenario description (textual)
- 1-year vs 3-year baseline averaging selection (with justification when 3-year averaging is selected for volatile FLW flows)
- Reference to baseline measurement period
- Baseline FLW destination identification

### 3.4 Additionality (VM0046 Section 7)

The schema `3.5 Additionality` covers all three additionality steps:

- **Step 1**: Identification of credible barriers (regulatory, financial, technological, institutional)
- **Step 2**: Common practice analysis demonstrating that the project activity is not common practice
- **Step 3**: Implementation barriers analysis

### 3.5 Calculation Procedures (VM0046 Section 8)

All 14 calculation equations are implemented in JavaScript within `customLogicBlock` instances:

| Equation | Formula | Implementation |
|---|---|---|
| Eq. 1 | `BE_y = Σ_j (BE_j,y + BE_Trans,j,y)` | Aggregation across all baseline streams |
| Eq. 2 | `M_DM,j,y = M_FLW,j,y × DM_j,y` | Implicit (used in Eq. 3-5) |
| Eq. 3 | Option 1 BE_j,y formula with facility-specific EF | Implemented per stream |
| Eq. 4 | Option 2 BE_j,y formula using SWDS parameters | Implemented with MCF lookup |
| Eq. 5 | Option 3 BE_j,y formula using default EF | Default destination matching |
| Eq. 6 | `BE_Trans,j,y = D_j × M_FLW × EF_trans × 0.001` | Per stream |
| Eq. 7 | `PE_y = PE_Trans,y + PE_Proc,y` | Project-level summation |
| Eq. 8 | `PE_Trans,y = D_m × M_FLW × EF_trans × 0.001` | Project-level |
| Eq. 9 | `PE_Proc,y = PE_EC + PE_FC + OE_y` | Sum of electricity, fossil fuel, packaging |
| Eq. 10 | `OE_y = Σ_p (M_material × EF_material)` | Lookup against VM0046 Table 3 |
| Eq. 11 | `LE_y = LE_d + LE_v` | Sum of discards and valorization leakage |
| Eq. 12 | `LE_d = BE_j,y × LF` | Per stream, applied unless Step-1 evidence |
| Eq. 13 | `LE_v = EF_CO2,LE × M_FLW × NCV` | Applied only for valorization destinations |
| Eq. 14 | `ER_y = BE_y − PE_y − LE_y` | Net emission reductions |

### 3.6 Monitoring (VM0046 Section 9)

The schema `5.3 Monitoring Plan` covers all 10 monitoring requirements: data parameters monitored, measurement methods, monitoring frequency, QA/QC procedures, data archival policy, monitoring team responsibilities, and digital recording mechanisms.

19 data parameters from VM0046 Section 9.1 (validation) and 19 from Section 9.2 (monitoring) are captured as `Data / Parameter: X` schemas with embedded `Value applied for X` arrays supporting multi-period, multi-stream entries.

---

## 4. Calculation Engine

### 4.1 Engine Overview

Two `customLogicBlock` instances execute on document submission:

| Block | Trigger | Purpose | Size |
|---|---|---|---|
| `calculate_project_fields` | PDD submission | Ex-ante emission reduction estimation + V1–V12 validations | 15,230 chars |
| `calculate_report_fields` | MR submission | Ex-post emission reduction calculation + V1–V11 validations + multi-stream aggregation + mass balance check | 21,913 chars |

Both blocks use ECMAScript 2017 syntax (no transpilation required), execute server-side in Guardian's sandboxed VM, and have read-write access to the document being submitted.

### 4.2 Multi-Stream Aggregation

The MR engine supports multi-stream projects where Food Loss and Waste flows to multiple destinations. The engine groups input parameters by `(year, destination)` keys:

```javascript
const streams = {};
for (let i = 0; i < mFlwArr.length; i++) {
    const m = mFlwArr[i];
    const y = num(m.field1);
    const j = str(m.field2);  // FLW destination
    const k = key(y, j);
    if (!streams[k]) streams[k] = {year: y, dest: j, M_FLW: 0};
    streams[k].M_FLW += num(m.field0);
}
```

Per-stream parameters (DM, EF, transport distances) are looked up via `findVal()` which matches `(year, destination)` tuples. Project-level parameters (electricity, fossil fuel, packaging) are summed across streams. Output arrays in the MR document contain one record per stream for baseline, and one record per year for project-level emissions, leakage, and emission reductions.

This enables proper handling of heterogeneous projects (e.g., a retail chain sending 60 tonnes to landfill and 40 tonnes to composting in the same year, each with different DM and EF values).

### 4.3 Conditional Leakage Logic (VM0046 Section 8.3)

VM0046 Section 8.3 specifies that leakage equations apply conditionally based on the project's baseline destination type and the availability of Step-1 evidence:

```
if Step-1 evidence provided:
    LE_d = 0  (Eq. 12 not applied)
    LE_v = 0  (Eq. 13 not applied)
else:
    LE_d = BE_j × LF  (Eq. 12 always applied)
    if baseline destination ∈ {Composting, AD, Combustion, Landfill+flaring}:
        LE_v = EF_CO2 × M × NCV  (Eq. 13 applied)
    else:
        LE_v = 0
```

This logic is encoded in the JavaScript engine using a `VALORIZATION_DESTINATIONS` constant array and an `isValorization()` helper. Each calculation outputs a `leakageLogic` object documenting which equations were applied and why, providing a complete audit trail for VVB review.

### 4.4 Mass Balance Validation (VM0046 Section 8.2)

VM0046 Section 8.2 requires that the mass of recovered food equal the baseline FLW mass within tolerance. The MR engine computes:

```
ΔM = |M_FLW_baseline − M_recovered| / M_FLW_baseline × 100%
```

And applies the following thresholds:

| ΔM | Status | Action |
|---|---|---|
| ≤ 2% | OK | No action required |
| 2% − 10% | JUSTIFICATION_REQUIRED | Warning issued; PP must provide justification; VVB reviews |
| > 10% | FAILED | Error issued; project rejected (VCUs = 0) |

A `massBalanceCheck` object is written to the document with `M_FLW_total`, `M_recovered`, `delta_M_pct`, and `status` for VVB and Verra reviewer visibility.

### 4.5 Validations Summary (V1–V12)

| ID | Validation | Severity |
|---|---|---|
| V1 | Range checks: 0 < DM ≤ 1, 0 ≤ LF ≤ 1, M_FLW > 0 | Error |
| V2 | Required fields per Option (1, 2, or 3) | Error |
| V3 | Option 2 requires MCF and phi_SWDS | Error |
| V4 | Option 3 requires EF_default | Error |
| V5 | (reserved) | — |
| V6 | Net positive ER (ER_y > 0) | Error if violated |
| V7 | Aggregate validation status (APPROVED / APPROVED_WITH_WARNINGS / REJECTED) | Auto-derived |
| V8 | Mass balance ΔM ≤ 10% (per Section 8.2) | Error if > 10%, warning if 2-10% |
| V9 | Baseline transport distance defined per stream | Warning |
| V10 | Option-specific sanity (DM_facility ≥ DM, f_j ≤ 1, GWP_CH4 in [20, 35]) | Mixed |
| V11 | Project boundary inclusion consistency (PE/BE ratio < 50%, LE/BE < 30%) | Warning |
| V12 | Step-1 evidence justification ≥ 100 chars; Type (i) surplus ≥ 25% | Mixed |

When any error is raised, the engine sets `validationStatus = "REJECTED"` and `VCUs = 0`, ensuring no VCUs are issued for non-conforming submissions.

### 4.6 Formula Linked Definitions (FLD)

Per VCS Standard v4.4 transparency requirements, the policy includes **Formula Linked Definitions (FLD)** — a declarative, human-readable representation of all VM0046 calculation logic in standard mathematical (LaTeX) notation. The FLD complements (does not replace) the JavaScript calculation engine: customLogicBlock executes calculations, FLD documents them for reviewers.

The FLD is stored within the policy archive (`formulas/` directory) and contains **42 components**:

| Component Type | Count | Purpose |
|---|---|---|
| **Constants** | 5 | Fixed methodology values (GWP_CH4=28, phi_SWDS Humid/Dry, f_degradable, NCV_default) |
| **Variables** | 19 | Input parameters with bindings to specific schema fields in MR Template |
| **Formulas** | 14 | All VM0046 Section 8 equations in LaTeX notation |
| **Text** | 4 | Logic-based rules that cannot be expressed as pure formulas |

**Variables** — each of the 19 VM0046 input parameters is declared as a Variable with:
- LaTeX-formatted name (e.g. `M_{FLW,j,y}`, `\phi_{SWDS}`)
- Description referencing VM0046 documentation
- Direct link to the source schema field (18 of 19 linked to MR Template fields; M_recovered is documentation-only)

This enables Verra reviewers to click any variable in a displayed formula and navigate directly to the field where the actual project data is entered.

**Formulas** — all 14 equations from VM0046 Section 8 are encoded as Formula components in LaTeX:

| FLD Formula | LaTeX Notation | Type |
|---|---|---|
| `BE_y` (Eq. 1) | `BE_y = \sum_j (BE_{j,y} + BE_{Trans,j,y})` | Aggregator |
| `M_{DM,j,y}` (Eq. 2) | `M_{DM,j,y} = M_{FLW,j,y} \times DM_{j,y}` | Intermediate |
| `BE_{j,y}^{Option1}` (Eq. 3) | `BE_{j,y} = 0.9 \times M_{FLW} \times \frac{DM}{DM_{facility}} \times EF_j` | Per-stream |
| `BE_{j,y}^{Option2}` (Eq. 4) | `BE_{j,y} = \phi_{SWDS} \times (1-f_j) \times GWP \times MCF \times f_{deg} \times M \times DM` | Per-stream |
| `BE_{j,y}^{Option3}` (Eq. 5) | `BE_{j,y} = M_{FLW,j,y} \times DM_{j,y} \times EF_{default,j}` | Per-stream |
| `BE_{Trans,j,y}` (Eq. 6) | `BE_{Trans,j,y} = D_{j,y} \times M_{FLW} \times EF_{trans} \times 0.001` | Per-stream |
| `PE_y` (Eq. 7) | `PE_y = PE_{Trans,y} + PE_{Proc,y}` | Aggregator |
| `PE_{Trans,y}` (Eq. 8) | `PE_{Trans,y} = D_{m,x,y} \times M_{FLW} \times EF_{trans} \times 0.001` | Project-level |
| `PE_{Proc,y}` (Eq. 9) | `PE_{Proc,y} = PE_{EC,y} + PE_{FC,y} + OE_y` | Project-level |
| `OE_y` (Eq. 10) | `OE_y = \sum_p M_{material,p,y} \times EF_{material,p}` | Project-level |
| `LE_y` (Eq. 11) | `LE_y = LE_d + LE_v` | Aggregator |
| `LE_d` (Eq. 12) | `LE_d = \sum_j BE_{j,y} \times LF_{i,l}` | Conditional |
| `LE_v` (Eq. 13) | `LE_v = EF_{CO_2,LE} \times M_{FLW} \times NCV_y` | Conditional |
| `ER_y` (Eq. 14) ⭐ | `ER_y = BE_y - PE_y - LE_y` | Final |

The four main aggregator formulas (`BE_y`, `PE_y`, `LE_y`, `ER_y`) have **Output Links** to their corresponding fields in the `Ex-post Emission Reductions` array within MR Template. This provides a complete bidirectional trace: from input variable → through formula → to recorded output value.

**Text components** — four documentation blocks describe rules that cannot be expressed as pure formulas:

| Text Component | Documents |
|---|---|
| Conditional Leakage Logic (VM0046 Section 8.3) | When Eq. 12 and Eq. 13 apply / are skipped based on Step-1 evidence and destination type |
| Mass Balance Verification (VM0046 Section 8.2) | ΔM thresholds (≤2% OK, 2-10% justification, >10% reject) |
| Multi-Stream Aggregation Architecture | How Guardian groups inputs by (year, destination) tuples |
| CDM Tools Methodology Deviation (VCS Standard 3.4) | External execution of Tools 03/05/16 in Calculation Workbook |

**Reviewer experience** — when a Verra reviewer opens any document with linked formulas (PDD, MR), they see a "Formulas" button that opens a navigable display of all 14 VM0046 equations rendered as standard LaTeX. Each variable is clickable, drilling down to the source schema field. This provides full mathematical transparency without requiring inspection of JavaScript source code.

The FLD structure conforms with VCS Standard v4.4 dMRV transparency requirements and the Hedera Guardian Formula Linked Definitions specification (Guardian v3.1+).

---

## 5. Schema Architecture

The DMRV system implements 88 production-grade JSON schemas organized into 6 hierarchical groups:

### 5.1 Group A — Top-Level VCS Templates (4 schemas)

These templates correspond directly to VCS Standard v4.4 document templates:

| Schema | VCS Reference | Sub-Schema Fields |
|---|---|---|
| VM0046 Project Description Template v1.0 | VCS Standard v4.4 — VCS PDD | 79 fields |
| VM0046 Monitoring Report Template v1.0 | VCS Standard v4.4 — VCS MR | 53 fields |
| VM0046 Validation Report Template v1.0 | VCS Standard v4.4 — Validation | 50 fields |
| VM0046 Verification Report Template v1.0 | VCS Standard v4.4 — Verification | 50 fields |

Each template references composite Sub-Schemas via JSON Schema `$ref` (with content-addressed IPFS URIs after policy publication).

### 5.2 Group B — VCS Section Schemas (34 schemas)

Each VCS PD section (1.1, 1.2, ..., 5.3) is a separate Sub-Schema, enabling reuse across templates:

- **Group B-1** (9 schemas): Section 1 — Project Details (Summary, Audit History, Sectoral Scope, Project Proponent, etc.)
- **Group B-2** (13 schemas): Section 2 — Safeguards (Stakeholders, Risk Assessment, Human Rights, Ecosystem Health, etc.)
- **Group B-3** (12 schemas): Section 3-5 — Methodology, Application, Quantification, Monitoring (including Extended versions of 3.6 and 4.3 from Iterations 4–5; Extended 3.2 from Iteration 9)

### 5.3 Group C — Data Parameter Cards & Value Applied (38 schemas)

For each of the 19 VM0046 Section 9 monitored parameters:

- **Data / Parameter: X** — descriptive card (description, unit, equation, source, measurement method, monitoring frequency, QA/QC procedures, archival policy)
- **Value applied for X** — array of numeric values per (year, destination, food category)

This separation enables Project Proponents to document parameter methodology (validation phase) and report values (monitoring phase) using the same underlying parameter definition.

### 5.4 Group D — Calculation Result Schemas (8 schemas)

Result containers for each engine output:

- Ex-ante Total Baseline Emissions / Project Emissions / Leakage Emissions / Emission Reductions
- Ex-post Total Baseline Emissions / Project Emissions / Leakage Emissions / Emission Reductions

### 5.5 Group E — Workflow Schemas (3 schemas)

- Vintage period
- CCP Labels (placeholder for ICVCM Core Carbon Principles when VM0046 receives ICVCM approval)
- ERRs & VCUs Permanence Risk Buffer (set to 0% for VM0046, which is non-AFOLU)
- Ex-ante vs Ex-post ERR Comparison

### 5.6 Standardized Enumerations

To enforce consistency across data entries, the following enumerations are applied via `Enum` field type:

**FLW Destinations (10 values, VM0046 Appendix 1)**: applied to 7 Value applied schemas
1. Anaerobic Digestion (Wet)
2. Anaerobic Digestion (Dry)
3. Composting (Active)
4. Composting (Passive)
5. Controlled Combustion
6. Landfill (with flaring)
7. Landfill (without flaring)
8. Open Burning
9. Open Dump
10. Sewer/wastewater treatment

**Food Categories (16 values, GSFA Annex C / Codex 192-1995)**: applied to `Value applied for M_FLW,j,y`

**Landfill Sub-Destinations (3 values)**: applied to `Value applied for f_j,y` (CH4 capture fraction is only meaningful for landfills)

This standardization ensures that the calculation engine's destination matching never fails due to free-text spelling variations and enables Verra to aggregate data across projects using consistent vocabularies.

---

## 6. Workflow

### 6.1 Roles

| Role | Description | VCS Reference |
|---|---|---|
| Project Proponent (PP) | Submits PDD and Monitoring Reports | VCS Standard 3.6 |
| Validation/Verification Body (VVB) | Independent third-party auditor | VCS Standard 4.4 |
| Verra Owner | Program owner; final approval; VCU mint authorization | VCS Programme Manual |

### 6.2 Lifecycle

```
[PP]   Submit Project Description
  ↓
  [JS] Compute ex-ante BE, PE, LE, ER + V1–V12 validations
  ↓
  Status: "Waiting to Validate"
  ↓
[VVB]  Open project; create Validation Report
  ↓
  Conclusion: POSITIVE / POSITIVE WITH QUALIFICATIONS / NEGATIVE
  ↓
  Status: "Waiting for Approval"
  ↓
[Verra Owner]  Approve Validation Report
  ↓
  Status: "Validated"  →  PP can now create MRs
  ↓
[PP]   Submit Monitoring Report (per period)
  ↓
  [JS] Compute ex-post BE, PE, LE, ER + V1–V12 validations + Mass Balance V8
  ↓
  Status: "Waiting for Verification"
  ↓
[VVB]  Verify MR; create Verification Report
  ↓
  Conclusion: POSITIVE / NEGATIVE
  ↓
  Status: "Verified"
  ↓
[Verra Owner]  Approve Verification Report → Mint VCUs on Hedera
  ↓
  VCUs issued to PP wallet (HTS fungible token, 0 decimals)
```

### 6.3 Workflow Implementation

The workflow is implemented as 216 interconnected blocks in Guardian Policy Configurator:

| Block Type | Count | Purpose |
|---|---|---|
| `interfaceContainerBlock` | ~40 | Layout containers and tabs |
| `interfaceDocumentsSourceBlock` | ~25 | Document grids per role |
| `documentsSourceAddon` | ~30 | Filtered document queries |
| `requestVcDocumentBlock` | ~10 | Form-based document submission |
| `sendToGuardianBlock` | ~25 | Persist documents to MongoDB + Hedera |
| `customLogicBlock` | 2 | JavaScript calculation engines |
| `mintDocumentBlock` | 1 | VCU minting on Hedera Token Service |
| `documentValidatorBlock` | 1 | Schema validation enforcement |
| `policyRolesBlock` | 2 | Role assignment |
| `interfaceStepBlock` | 5 | Multi-step form navigation |
| Other | ~75 | Buttons, switches, role conditions |

All blocks reference schemas via stable IRIs, ensuring schema replacements do not break the workflow.

---

## 7. Methodology Deviations

In accordance with VCS Standard v4.4 Section 3.4, the following methodology deviation is declared:

### 7.1 CDM Methodological Tools (Tools 03, 05, 16)

**Deviation**: VM0046 Section 9.2 references CDM Methodological Tools 03 (Fossil Fuel), 05 (Electricity), and 16 (Biomass) for calculation of project emissions from electricity (PE_EC,y), fossil fuel (PE_FC,y), and Net Calorific Value (NCV) of biomass (Eq. 13).

**Implementation**: These tools are NOT integrated as JavaScript subprocedures within the Guardian customLogicBlock. Instead, calculations are performed using an external Calculation Workbook (Microsoft Excel), and final values are entered into Guardian as numeric inputs. The Calculation Workbook is attached to each Monitoring Report as an IPFS-linked appendix.

**Justification (Conservativeness)**:

1. **Identical Results**: CDM Tools yield deterministic results regardless of platform. Excel implementation produces identical values to any hypothetical Guardian implementation.
2. **Maintenance Burden Reduction**: CDM Tools are revised periodically (Tool 05 had revisions in 2022 and 2024). Embedding them in JavaScript would require frequent Guardian policy updates with associated schema migration risk.
3. **Independent Verification**: VVB independently re-runs the Calculation Workbook against MR inputs during verification, providing a stronger verification path than verifying customLogicBlock outputs alone.
4. **VCS Standard 4.4 Conformance**: Standard explicitly permits external calculations when results are documented and verifiable.

**Documentation Requirements**:

The schema `3.6 Methodology Deviations (Extended)` (Iteration 4) captures structured documentation of this deviation including:

- Tool versions used (Tool 03 v3.0, Tool 05 v3.0, Tool 16 v4.0)
- IPFS URLs of calculation workbooks
- Grid system reference for Tool 05 (e.g., "WECC USA")
- Operating Margin and Build Margin data sources
- NCV value source (IPCC default 11.6 GJ/t for hard coal)
- VVB verification approach
- Workbook archival policy (IPFS with permanent CID, 2+ years post-crediting)

This declaration enables Verra reviewer audit of Tool application without requiring runtime execution of Tools within Guardian itself.

### 7.2 Other Deviations

No other methodology deviations are applied. The implementation follows VM0046 v1.0 calculation procedures, applicability conditions, monitoring requirements, and data parameter specifications.

---

## 8. Step-1 Evidence Logic (VM0046 Section 8.3)

### 8.1 Background

VM0046 Section 8.3 permits Project Proponents to forgo leakage emissions calculations (Eq. 12 and Eq. 13) when sufficient evidence demonstrates that recovered food does not displace baseline biomass production. Two evidence types are recognized:

- **Type (i) — Biomass Surplus**: Recovered food enters a downstream product/service where biomass supply exceeds demand by ≥25%. Evidence must include peer-reviewed studies, industry reports, or market analysis (anecdotal evidence is insufficient per VCS Standard 4.4).

- **Type (ii) — FLW Would Have Decayed**: Site-specific evidence demonstrating that without project intervention, the FLW would have decayed in place rather than being processed at a destination. Examples: on-farm losses, retail compactor pre-collection.

### 8.2 DMRV Implementation

The schema `4.3 Leakage Emissions (Extended)` (Iteration 5) provides 18 structured fields:

| Group | Fields | Purpose |
|---|---|---|
| Eq. 12/13 applicability | field0, field3 | Boolean flags |
| LF parameter | field1, field2 | Source citation + numeric value |
| Step-1 evidence flag | field4, field5 | Boolean + Type selection |
| Type (i) Biomass Surplus | field6–field9 | Product, quantification, % surplus, source |
| Type (ii) FLW Decay | field10–field12 | Pre-project destination, evidence, contracts |
| Justification | field13, field14 | ≥100-char text + IPFS supporting docs |
| VVB review | field15 | Status (Pending/Verified/Rejected) |
| Overall description | field16, field17 | Summary + conservativeness margin |

### 8.3 JavaScript Logic

Both calculation engines read these fields and apply the conditional leakage logic. Validation V12 enforces that:

- If `Step-1 Evidence Provided = TRUE` and justification is < 100 characters → warning issued
- If `Type = Biomass Surplus` and `surplus % < 25` → error issued (rejecting the project)

This ensures Step-1 evidence claims are substantive and conform to VM0046 quantitative thresholds.

---

## 9. Audit Trail and Verification

### 9.1 Hedera Audit Trail

Every state transition in the workflow produces a Hedera Consensus Service (HCS) message:

- PDD submission → HCS message with VC ID + schema reference + PP signature
- JS calculation → embedded in PDD VC; deterministic given inputs
- Validation Report submission → HCS message + VVB signature + reference to validated PDD
- Verra Owner approval → HCS message + Owner signature
- MR submission → HCS message + PP signature + reference to validated project
- Verification Report → HCS message + VVB signature + reference to MR
- VCU mint → Hedera Token Service transaction with serial numbers

All HCS topics are public and queryable via Hedera mirror nodes (e.g., `https://mainnet.mirrornode.hedera.com`). Auditors can independently reconstruct the full audit trail without relying on the DMRV operator.

### 9.2 Verifiable Credentials

Each document is wrapped as a W3C Verifiable Credential v1.1 with:

- `issuer` field set to the role's DID (Hedera DID method)
- `issuanceDate` ISO 8601 timestamp
- `credentialSubject` containing schema-conforming data
- `proof` using Ed25519Signature2018

VC integrity is verifiable using the issuer's public key resolved via Hedera DID resolver.

### 9.3 IPFS Content Addressing

Schema definitions, large enum lists, and supporting documents are stored on IPFS with content-addressed CIDs. The policy hash (computed at publication time) includes all schema CIDs, ensuring schema integrity is cryptographically anchored.

### 9.4 Independent Verification

Any party can independently verify the DMRV implementation:

1. **Schema Verification**: Download policy from Guardian IPFS gateway, validate hash matches Hedera Topic ID announcement, inspect schemas for VM0046 conformance.
2. **Calculation Verification**: Extract JavaScript from `customLogicBlock` instances, run against test inputs, confirm match with VM0046 manual calculations.
3. **VC Verification**: Query Hedera for VC IDs, retrieve from mirror node, validate Ed25519 signatures using DIDs.
4. **VCU Provenance**: Trace VCU serial numbers back through Verification Report → MR → Validation Report → PDD chain.

---

## 10. Data Quality and Privacy

### 10.1 Data Quality

| Mechanism | Description |
|---|---|
| Schema validation | JSON Schema Draft 7 validation at submission; rejects malformed documents |
| Range validations (V1) | DM ∈ (0,1], LF ∈ [0,1], M_FLW > 0; enforced in JS |
| Mass balance (V8) | ΔM ≤ 10% strict; 2-10% requires justification |
| Boundary consistency (V11) | Warnings on inconsistent flag combinations |
| Enum enforcement | FLW Destination, Food Category, MCF, phi_SWDS standardized |

### 10.2 Privacy

The DMRV system stores VCs on Hedera with the following privacy considerations:

- VCs contain commercial data (FLW masses, project locations) — Project Proponents are advised to treat HCS topics as public
- Personal data (PP contact info, beneficiary individuals) is NOT recorded on-chain; only references and document hashes
- Aggregate emission reduction data on-chain is appropriate for VCS public registry transparency requirements

### 10.3 Data Retention

- Hedera HCS: permanent (decentralized network)
- Guardian MongoDB: minimum 2 years post-crediting period (VCS Standard 4.4)
- IPFS pinning: maintained throughout crediting period; backups retained 2+ years post-crediting

---

## 11. System Limitations and Future Work

### 11.1 Known Limitations

1. **Single-stream PDD ex-ante**: The `calculate_project_fields` engine handles single-stream ex-ante estimates. Multi-stream PDDs require manual aggregation across destinations. (MR engine fully supports multi-stream.) This limitation may be addressed in a future iteration if needed.

2. **CDM Tools external execution**: As declared in Section 7, Tools 03/05/16 calculations are performed in Excel. While VVB independent re-execution provides verification, this introduces a manual step.

3. **ICVCM CCP Labels (placeholder)**: VM0046 has not yet received ICVCM Core Carbon Principles approval. The `CCP Labels` schema is included as a placeholder for activation upon approval.

4. **Permanence Risk Buffer (placeholder)**: Set to 0% as VM0046 is non-AFOLU. Schema retained for cross-methodology consistency.

### 11.2 Future Enhancements

- Integration with FAO FLW Database for region-specific LF defaults
- Automated GSFA category code lookup from Codex Alimentarius API
- Multi-stream PDD ex-ante extension matching MR engine
- Direct CDM Tools integration (Tool 05 OM/BM lookup, Tool 16 NCV defaults)

---

## 12. Conformance Statement

This DMRV system implements **VM0046 v1.0 (12 July 2023)** in full conformance with:

- All 5 applicability conditions (Section 4)
- Project boundary specifications (Section 5)
- Baseline scenario procedure (Section 6)
- Additionality assessment (Section 7)
- All 14 calculation equations (Section 8.1–8.4)
- All 19 validation parameters (Section 9.1)
- All 19 monitoring parameters (Section 9.2)
- Monitoring plan requirements (Section 9.3)
- Tables 1–5 (FLW destinations, default EFs, packaging EFs, leakage factors)

The implementation conforms with **VCS Standard v4.4** for:

- Project Description template
- Monitoring Report template
- Validation Report template
- Verification Report template
- Stakeholder consultation requirements
- Safeguards (Sections 2.1–2.4)
- Audit trail and crediting period requirements

The implementation declares **one methodology deviation** (CDM Tools external execution) per VCS Standard 3.4, with full justification and structured documentation.

---

## 13. Document References

| Reference | URL / Identifier |
|---|---|
| VM0046 v1.0 Methodology | https://verra.org/methodology/vm0046-methodology-for-reducing-food-loss-and-waste-v1-0/ |
| Hedera Guardian | https://docs.hedera.com/guardian/ |
| Hedera Hashgraph | https://hedera.com/ |
| W3C Verifiable Credentials v1.1 | https://www.w3.org/TR/vc-data-model/ |

---

## 14. Submission Package Contents

This DMRV System Description is part of a Verra digitization submission package containing:

1. **VM0046 DMRV System Description** (this document)
2. **VM0046 Guardian Policy file** (`.policy` archive containing 88 schemas, workflow JSON, calculation engine JavaScript, and **embedded Formula Linked Definitions** with all 14 VM0046 equations in LaTeX notation — see Section 4.6)
3. **Sample Project Description** (PDD VC exported from Guardian for a representative project)
4. **Sample Monitoring Report** (MR VC exported from Guardian)
5. **Calculation Workbook** (Excel applying CDM Tools 03/05/16)
6. **Methodology Conformance Matrix** (line-by-line VM0046 vs. DMRV implementation cross-reference)
7. **Hedera Topic ID** (assigned at policy publication; provides immutable audit anchor)
8. **Policy Hash** (cryptographic identifier of the published policy version)

## 15. Step By Step

1. Log in as a **Standard Registry (SR)**. You will see the main dashboard with all available tabs.

<figure><img src="images/1.png" alt=""><figcaption></figcaption></figure>

2. Create a new user and assign the **Project Proponent** role.

<figure><img src="images/2.png" alt=""><figcaption></figcaption></figure>

3. Click the **New Project** button and fill in all the required project details.

<figure><img src="images/3.png" alt=""><figcaption></figcaption></figure>
<figure><img src="images/3_2.png" alt=""><figcaption></figcaption></figure>

4. Once the project details are submitted, the project waits for Verra's approval.

<figure><img src="images/4.png" alt=""><figcaption></figcaption></figure>

5. Create another new user and assign the **VVB (Validation & Verification Body)** role.

<figure><img src="images/5.png" alt=""><figcaption></figcaption></figure>

6. Set the VVB name.

<figure><img src="images/6.png" alt=""><figcaption></figcaption></figure>

7. Once the VVB name is set, it waits for SR approval.

<figure><img src="images/7.png" alt=""><figcaption></figcaption></figure>

8. Log in as **SR** and approve the VVB.

<figure><img src="images/8.png" alt=""><figcaption></figcaption></figure>

9. Once the VVB is approved, go to the **SR** tab and click **Add**.

<figure><img src="images/9.png" alt=""><figcaption></figcaption></figure>

10. After the project is added, it waits for validation from Verra.

<figure><img src="images/10.png" alt=""><figcaption></figcaption></figure>

11. Log in as **ProjectProposal** and assign the project to the VVB.

<figure><img src="images/11.png" alt=""><figcaption></figcaption></figure>

12. Log in as **VVB**, review the project document details, and click **Validate** to approve the project.

<figure><img src="images/12.png" alt=""><figcaption></figcaption></figure>
<figure><img src="images/12_2.png" alt=""><figcaption></figcaption></figure>

13. Log in as **Project Proponent** and add the **Monitoring Report**.

<figure><img src="images/13.png" alt=""><figcaption></figcaption></figure>
<figure><img src="images/13_2.png" alt=""><figcaption></figcaption></figure>

14. Log in as **VVB** and click **Verify** to validate the monitoring report.

<figure><img src="images/14.png" alt=""><figcaption></figcaption></figure>
<figure><img src="images/14_2.png" alt=""><figcaption></figcaption></figure>

15. Log in as **SR** and click **Mint** to issue the tokens (VCUs).

<figure><img src="images/15.png" alt=""><figcaption></figcaption></figure>

16. Formulas are now available in the **Formula Linked Definitions** tab.

<figure><img src="images/16.png" alt=""><figcaption></figcaption></figure>
<figure><img src="images/17.png" alt=""><figcaption></figcaption></figure>
