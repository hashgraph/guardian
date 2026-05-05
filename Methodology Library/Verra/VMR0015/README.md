# VMR0015 — Methodology for Low Greenhouse Gas Emitting Safe Drinking Water Production Systems (v1.0)

This directory contains a Guardian policy implementation of **VMR0015 v1.0**, the Verra revision of the CDM AMS-III.AV methodology, for **decentralised measurement, reporting and verification (dMRV) of safe drinking-water projects** that displace woody-biomass and fossil-fuel boiling.

> **Status:** Implementation under active testnet validation. Policy package, schemas, and equation engine are complete. Full end-to-end dry-run on Guardian testnet is in progress; this PR is opened early so the architecture and methodology mapping can be reviewed in parallel.

---

## 1. What VMR0015 changes vs. AMS-III.AV

VMR0015 retains the project boundary, applicability conditions, and emission-reduction structure of CDM AMS-III.AV, but adds three substantive deltas:

| # | Delta | Where it appears in this policy |
|---|---|---|
| 1 | **Eligibility expanded to woody-biomass baselines** — the project may displace households whose baseline boiling fuel is non-renewable woody biomass, not only fossil fuel. | `Baseline Fuel Mix` schema: explicit woody-biomass fraction field plus fossil fraction; eligibility gate in PD form. |
| 2 | **Updated leakage assessment** for woody-biomass cases, cross-referencing **AMS-I.E paragraph 32** (and AMS-I.I where applicable). | Dedicated `Leakage Adjustment` schema with method-choice enum and woody/fossil split; `customLogicBlock` applies LE_woody only when relevant. |
| 3 | **Updated default fNRB and EF for woody biomass** — fields surfaced in the schema with VMR0015 defaults and explicit justification field. | `Baseline Fuel Mix` schema: `fNRB`, `EF_woody`, `NCV_woody` + free-text justification. |

Everything else (PE_y, BE_y core, monitoring period structure, ER_y subtraction) follows AMS-III.AV faithfully and reuses the official CDM Tools chain (Tool 03, 05, 19, 21, 30) so that compliance with the parent CDM methodology is preserved.

---

## 2. Architecture

The policy uses the **canonical Guardian policy architecture** observed in the official `CDM_AMS-III.AV.policy` shipped under `Methodology Library/UNFCCC CDM Methodologies/`:

- **Roles:** `Project Participant`, `VVB`, plus `OWNER` (Standard Registry) and `NO_ROLE`.
- **Root container:** `interfaceContainerBlock` with four children:
  1. `Choose_Roles` (`policyRolesBlock`, NO_ROLE)
  2. `header` (OWNER navigator)
  3. `pp_step` (`interfaceStepBlock`, Project Participant lifecycle)
  4. `VVB` (`interfaceContainerBlock`, validation + verification)
- **Lifecycle:**
  Project Participant registers → submits Project Description → VVB validates → PP submits Monitoring Report → VVB verifies → SR mints **CER** tokens.
- **Calculation:** the official **CDM Tools chain** (Tool 03 → 05 → 30 → 19 → 21 → 01) is invoked for both the project-form path and the monitoring-report path. A single `customLogicBlock` performs the final ER_y subtraction with a VMR0015-specific leakage branch for woody-biomass cases.

### Schema set (14 schemas, all original IRIs)

Leaf schemas, composed via `$ref`:

1. Geographic Location
2. Household Profile
3. Baseline Fuel Mix (VMR0015) — encodes deltas 1 and 3
4. Water Purification Device
5. Operating Performance
6. Water Quality Test
7. Project Activity Emissions
8. Baseline Emissions Breakdown
9. Leakage Adjustment (VMR0015) — encodes delta 2
10. Monitoring Reporting Period

Composition / role schemas:

11. Project Description (PD) — composes 1, 2, 3, 4, 7, 8, 9
12. Monitoring Report (MR) — composes 4, 5, 6, 10, 7, 8, 9
13. Project Participant role VC
14. VVB role VC

All schemas follow JSON-Schema 2020 with `$comment`-encoded Guardian metadata (term, orderPosition, customType), exactly as in the official CDM and Verra reference policies. **No schema is a copy of an existing UUID** — every IRI was minted fresh for this submission.

---

## 3. CDM Tools used

The same Tools chain as the official AMS-III.AV reference policy:

| Tool | Purpose | Mainnet messageId (resolved at import) |
|---|---|---|
| TOOL01 | Tool to determine project emissions from electricity consumption | `1706631425.948094003` |
| TOOL03 | Tool to calculate project or leakage CO2 emissions from fossil fuel combustion | `1706631448.682945638` |
| TOOL05 | Baseline, project and/or leakage emissions from electricity consumption and monitoring of electricity generation | `1706631483.748599478` |
| TOOL07 | Tool to calculate the emission factor for an electricity system | `1706631514.625077116` |
| TOOL19 | Demonstration of additionality of microscale project activities | `1706631545.501500626` |
| TOOL21 | Demonstration of additionality of small-scale project activities | `1706631586.378187842` |
| TOOL30 | Calculation of the fraction of non-renewable biomass | `1706631636.255262252` |

Tool stubs in `tools/` reference these messageIds; Guardian's resolver fetches the full tool definitions from Hedera at policy import.

---

## 4. Token

- **CER** — Verified Emission Reduction (Certified) — non-fungible, decimals `0`.
- Token configuration matches the CDM AMS-III.AV reference token configuration (admin/KYC/freeze/wipe/supply keys all enabled so the Standard Registry retains regulatory control).

---

## 5. How to import and run

1. Open Guardian Standard Registry account.
2. **Policies → Import → File**, select `VMR0015.policy`.
3. Wait for resolver to fetch the 7 CDM Tools from Hedera.
4. **Dry Run** (or Publish on testnet).
5. Walk the lifecycle:
   1. **Project Participant** registers, submits Project Description.
   2. **VVB** opens the Validation tab, signs the Validation Report.
   3. **Project Participant** submits a Monitoring Report.
   4. **VVB** verifies and signs the Verification Report.
   5. **Standard Registry** mints CER tokens equal to the calculated `ER_y`.

A worked example (`tc1_full_lifecycle`) covering one project, two devices, one monitoring period of 365 days, and a representative woody-biomass-heavy baseline is included for testing.

---

## 6. Equation summary (encoded in `customLogicBlock`)

```
BE_y_woody  = Σ (Q_y · SE) · f_woody · fNRB · NCV_woody · EF_woody
BE_y_fossil = Σ (Q_y · SE) · f_fossil          · NCV_fossil · EF_fossil
BE_y        = BE_y_woody + BE_y_fossil

PE_y        = PE_electricity + PE_transport + PE_manufacturing + PE_aux

LE_y        = LE_woody (per AMS-I.E §32)  +  LE_fossil
            (LE_woody only when f_woody > 0)

ER_y        = BE_y − PE_y − LE_y
```

Where `Q_y` is total purified water (L) for the period, `SE` is specific baseline energy required to boil 1 L of water (MJ/L), and the f_*, NCV_*, EF_* terms come from the `Baseline Fuel Mix` VC.

---

## 7. Files in this directory

| File | Purpose |
|---|---|
| `README.md` | This document. |
| `LICENSE` | MIT. |
| `VMR0015.policy` | The Guardian policy package (zip with policy.json, schemas, tools, token, artifacts). |
| `VMR0015.pdf` | Verra's published VMR0015 v1.0 methodology PDF (reference only — not redistributed if licensing requires; otherwise included). |
| `workflow.png` | Visual diagram of the policy block tree and lifecycle. |

---

## 8. Compliance notes and known limitations

- **Testnet-only at submission time.** The policy was developed and exercised on Hedera Testnet; mainnet topics will be created when an SR registers it on production.
- **Dry-run validation is in progress.** This PR is opened early to allow the methodology mapping and architecture to be reviewed in parallel with end-to-end testnet verification. A follow-up commit will append a `dry-run.md` capturing the screenshots and on-chain message IDs of one full lifecycle.
- **Tool stubs reference mainnet messageIds.** Guardian's import resolver fetches the canonical CDM tool definitions cross-network; this is the same pattern used by every other CDM/Verra policy already in the Methodology Library.
- **Original work, fresh IRIs.** No schema UUID, block UUID, token UUID, or topic ID is copied from any prior policy submission. The block-tree architecture (root container, role steps, event chaining) is intentionally aligned with the official CDM AMS-III.AV reference because any deviation from that pattern breaks Guardian's policy engine.
- **AMS-I.E §32 cross-reference.** The leakage block applies the woody-biomass leakage adjustment described in AMS-I.E §32 only when the woody-biomass baseline fraction is greater than zero; otherwise leakage from fuel-stacking is calculated per AMS-I.I.

---

## 9. Author and contact

- **Author:** Bikram Biswas (`@BikramBiswas786`)
- **Email:** mattersp70@gmail.com
- **Hedera Testnet Account:** `0.0.8863462`
- **DID:** `did:hedera:testnet:6Gu9zNu2ipkxWZN1Yf7bRaYCXS1S5jBmNCuL24ZkSJbK_0.0.8863463`
- **Submission context:** DLT Earth bounty — VMR0015 v1.0 implementation.

Feedback, redlines, and review comments are welcome on this PR.
