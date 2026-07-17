# MECD v1.2 — Metered & Measured Energy Cooking Devices

> **A newer version is available.** This is the v1.2 policy bundle, used by
> the first MECD live deployment (ATEC × Earthood, GS11815 / GS11817, the
> first fully digital Gold Standard cookstove issuance). For new projects we
> recommend the Paris-Agreement-aligned [v2.0 policy](MECD%20v2.0/) instead.
> Existing v1.2 projects can stay on v1.2 until their current crediting period
> ends — see the [migration guide](MECD%20v2.0/migration-from-v1.2.md).

## Table of contents

<!-- TOC -->

- [Introduction](#introduction)
- [Why MECD](#why-mecd)
- [Workflow at a glance](#workflow-at-a-glance)
- [Policy guide](#policy-guide)
  - [Available roles](#available-roles)
  - [Quantification methods](#quantification-methods)
  - [Important documents and schemas](#important-documents-and-schemas)
  - [Token (carbon credit)](#token-carbon-credit)
  - [Step by step](#step-by-step)
    - [Registry (Gold Standard) flow](#registry-gold-standard-flow)
    - [Project Proponent flow](#project-proponent-flow)
    - [VVB flow](#vvb-flow)
- [Direct device measurement (vs. sample-based)](#direct-device-measurement-vs-sample-based)
- [Where this fits in the methodology lifecycle](#where-this-fits-in-the-methodology-lifecycle)

<!-- /TOC -->

## Introduction

Roughly 2.3 billion people still cook over open fires or basic biomass stoves.
The smoke causes ~3.2 million premature deaths a year (WHO), most of the wood
comes from non-renewable sources, and the soot is a measurable short-lived
climate forcer. Clean-cookstove projects swap those stoves for efficient
electric, LPG, biogas, or advanced biomass devices, and earn carbon credits
for the avoided emissions.

Cookstoves are one of the largest single project types in the voluntary
carbon market — but they've also been one of the most over-credited. A 2023
[University of California, Berkeley study](https://assets.researchsquare.com/files/rs-2606020/v1/c2e6a772-b013-49f9-9fc4-8d7d82d4bebc.pdf?c=1678869691)
found cookstove projects across all major standards over-credited by ~9× on
average. Gold Standard's Metered & Measured Energy Cooking Devices (MECD)
methodology was the closest to ground-truth (~1.3× over-credit), because it
monitors fuel and energy use directly per device instead of extrapolating
from sample surveys.

This Guardian policy implements MECD v1.2 end-to-end: project listing →
validation → monitoring → verification → token mint, with every step
recorded as a verifiable credential on the Hedera ledger. It was used for
ATEC's PoA GS11815 / VPA02 (GS11817) — the first fully digital MECD
issuance, verified by Earthood and minted on Hedera in 2024.

## Why MECD

Cookstove projects support SDGs 3 (health), 5 (gender), 7 (energy), and 13
(climate). To stay defensible, the methodology behind a project has to give
accurate — or at least conservative — emission reductions. Several existing
cookstove methodologies don't:

- [GS-TPDDTEC](https://globalgoals.goldstandard.org/407-ee-ics-technologies-and-practices-to-displace-decentrilized-thermal-energy-tpddtec-consumption/) and [GS-Simplified](https://globalgoals.goldstandard.org/408-ee-ics-simplified-methodology-for-efficient-cookstoves/) — sample-based, prone to overcrediting.
- [CDM-AMS-II-G](https://cdm.unfccc.int/methodologies/DB/GNFWB3Y6GM4WPXFRR2SXKS9XR908IO), [CDM-AMS-I-E](https://cdm.unfccc.int/methodologies/DB/JB9J7XDIJ3298CLGZ1279ZMB2Y4NPQ) — older CDM methodologies, less commonly used.
- **[GS-MECD](https://globalgoals.goldstandard.org/news-methodology-for-metered-measured-energy-cooking-devices/) — the one this policy implements.**

The Berkeley study mentioned above found MECD to be the closest match to
real ground-truth emissions of any major cookstove methodology, because it
demands per-device measurement instead of extrapolation. That same property
makes it well-suited to digital MRV (which is what this policy is for): if
your meter is already capturing data continuously, the path from raw data to
audit-ready credit can be automated.

This Guardian policy is the digital implementation of MECD v1.2, following
[Gold Standard's typical project lifecycle](https://academy.sustain-cert.com/wp-content/uploads/sites/3/2021/10/GS-Project-Cycle_15042021_Annyta.pdf).


## Workflow at a glance

The path from project listing to minted credits:

1. **VVB applies and is approved** by Gold Standard.
2. **Project Proponent submits a PDD** describing the project, baseline,
   and methodology choice (M1 or M2).
3. **Gold Standard lists the project**.
4. **Project Proponent assigns a VVB** to validate the PDD. The VVB
   submits a validation report; Gold Standard approves it.
5. **Project Proponent submits a monitoring report** for the period. The
   metered data flows in from the project's measurement system.
6. **Project Proponent assigns a VVB** to verify the monitoring report.
   The VVB submits a verification report.
7. **Gold Standard approves the verification report**, triggering the mint.
   VER tokens land in the Project Proponent's Hedera account, one per tCO2e.

Every step is a verifiable credential signed by the relevant role and
hash-anchored to a Hedera Consensus Service topic.

## Policy guide

The policy is published to the Hedera network. Import it via the GitHub
`.policy` file in this folder (`MECD-v1.2.policy`) or via the corresponding
Hedera topic.

### Available roles

- **Project Proponent** — project developer who deploys and operates the
  cookstove project and receives credits (VER).
- **VVB (Validation & Verification Body)** — independent third party that
  audits the PDD and each monitoring report.
- **Gold Standard (Standard Registry)** — trusted registry overseeing the
  full project cycle and authorising the mint.

### Quantification methods

MECD v1.2 supports two quantification methods:

- **Method 1 (WBT — Water Boiling Test)** — credits useful cooking energy.
  Uses baseline stove efficiency × fuel emission factors to compute a
  baseline EF on a useful-energy basis.
- **Method 2 (CCT — Controlled Cooking Test)** — credits the specific
  energy consumption ratio between baseline and project. The most common
  choice for projects where the baseline household has measurable per-meal
  energy use, including the ATEC GS11817 deployment.

(Method 3 (KPT — Kitchen Performance Test) is a v2.0 addition; not in
v1.2.)

### Important documents and schemas

The policy uses a familiar GS project lifecycle with five primary documents:

1. **Project Proponent / VVB Account Registration** — onboarding forms
   for the two non-registry roles. Reviewed and approved by Gold Standard.
2. **GS PDD (Project Design Document)** — the project's design — baseline
   fuel mix, methodology choice (M1/M2), target population, additionality
   argument, SDG contributions, ex-ante emission estimates.
3. **GS Validation Report** — VVB's sign-off on the PDD, with assessment
   team, evidence reviewed, finding log, and audit milestone records.
4. **Monitoring Report (Auto) GS** — aggregated metered data for one
   monitoring period, plus the computed BE / AE / LE / ER chain.
5. **Emission Reduction Document GS** — the calculator's output: per-fuel
   baseline rows, project emissions per branch (electric / fossil /
   renewable), leakage, and the final ER number.
6. **GS Verification Report** — VVB's sign-off on the monitoring report;
   triggers the mint when approved by Gold Standard.

### Token (carbon credit)

**Verified Emission Reduction (VER)** — fungible Hedera token, one per
tonne of CO2e avoided.

### Step by step

Screenshots are included only for the methodology-specific moments. Account
creation, role approvals, and "assign VVB" steps work the same way as in
every other Guardian policy.

#### Registry (Gold Standard) flow

The Standard Registry publishes the policy, holds the Hedera topic key, and
sits at every approval gate in the workflow.

1. Log in as the registry user and import the policy file from this folder.

2. Approve incoming Project Proponent and VVB account applications.

3. Review submitted PDDs and approve project listings.

4. Review and approve VVB validation reports.

5. Review and approve monitoring reports submitted by proponents.

6. Review and approve verification reports — this triggers the mint.

   [SCREENSHOT_PLACEHOLDER: verification report approval + mint]

7. Inspect the trust chain for any minted credit. Every step is signed and
   anchored to a Hedera Consensus Service topic, so any reviewer can trace a
   credit back through the project documents that produced it.

   [SCREENSHOT_PLACEHOLDER: trust chain view]

#### Project Proponent flow

1. Register an account (Project Proponent Account Registration form). Wait
   for Gold Standard to approve.

2. Submit a Project Design Document (PDD). This is the heaviest form — it
   covers project details, baseline fuel mix and EFs, methodology choice
   (M1 or M2), target population, additionality, and the ex-ante credit
   estimate.

   [SCREENSHOT_PLACEHOLDER: PDD submission form]

3. After Gold Standard lists the PDD, assign a VVB to validate it. Once the
   VVB submits a validation report and Gold Standard approves it, the
   project is live for monitoring.

4. For each monitoring period, submit a monitoring report. The form
   captures the period's metered data; the policy's `pp_er_calcs` block
   computes baseline / project / leakage emissions and the resulting ER.

   [SCREENSHOT_PLACEHOLDER: monitoring report submission]

5. Assign a VVB to verify the monitoring report.

6. Once Gold Standard approves the verification report, the VER tokens are
   minted directly into the proponent's Hedera account.

#### VVB flow

VVB is the external independent third party that audits the project at two
gates: validation (the PDD) and verification (each monitoring report). The
VVB can sign off, request changes, or reject.

1. After registering and being approved, the VVB sees PDDs assigned to them
   for validation. Reviews the baseline assumptions, methodology choice,
   eligibility, and additionality argument.

2. Submit a validation report. Once Gold Standard approves it, the project
   moves into the monitoring phase.

3. For each monitoring period the VVB is assigned to, review the monitoring
   report — spot-check the metered data, confirm the calc inputs, and
   submit a verification report.

   [SCREENSHOT_PLACEHOLDER: VVB verification review]

## Direct device measurement (vs. sample-based)

The "metered" in MECD is the methodological hook that makes the policy
work end-to-end on the ledger. Each project device carries a meter (or
fuel-sale records, in non-electric variants) and the data flows into the
monitoring report directly, without sample extrapolation. Most cookstove
methodologies historically required sample surveys of a few percent of
households and projected the rest, which is the principal source of
overcrediting in the sector.

The v2.0 revision tightens this further with a Continuously Tracked
Energy Consumption (CTEC) integrity check (≥95% of devices reporting per
period) and a meter-error adjustment. v1.2 doesn't enforce these but the
direct-measurement design is the same.

## Where this fits in the methodology lifecycle

MECD v1.2 is the version this policy implements. It was used for the first
fully digital MECD issuance (ATEC × Earthood, GS11815 / GS11817, Bangladesh,
2024) and remains supported for projects mid-crediting-period.

For new deployments, Gold Standard published a Paris-Agreement-aligned
revision in 2025 that supersedes v1.2:

- Adds **Method 3 (KPT)** as a third quantification path.
- Makes **upstream emission factors (UEF)** mandatory on every fuel.
- Adds a **conservativeness stack**: 90/10 uncertainty rule, per-capita
  consumption cap, downward adjustment factor, NDC-aligned BAU ceiling,
  meter-error adjustment.
- Adds **embodied leakage** for stove manufacturing in the deployment year.

The v2.0 implementation lives in [`MECD v2.0/`](MECD%20v2.0/) alongside
realistic ATEC-derived test fixtures, sanitised API curls, a migration
guide, and full per-role workflow documentation.

If you're starting a new project, use [v2.0](MECD%20v2.0/). If you're
mid-crediting-period on v1.2, stay on v1.2 until renewal — see the
[migration guide](MECD%20v2.0/migration-from-v1.2.md).
