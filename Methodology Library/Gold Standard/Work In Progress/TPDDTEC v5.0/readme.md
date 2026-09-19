# Technologies and Practices to Displace Decentralized Thermal Energy Consumption (TPDDTEC) — v5.0.0

## Table of contents

<!-- TOC -->

- [What this is](#what-this-is)
- [What's in this folder](#whats-in-this-folder)
- [Cooking and heating projects in plain English](#cooking-and-heating-projects-in-plain-english)
- [Why TPDDTEC, and why v5.0](#why-tpddtec-and-why-v50)
- [Conservativeness stack — the v5.0 difference in one picture](#conservativeness-stack--the-v50-difference-in-one-picture)
- [Roles and what each one does](#roles-and-what-each-one-does)
  - [Gold Standard (Standard Registry)](#gold-standard-standard-registry)
  - [VVB — Validation & Verification Body](#vvb--validation--verification-body)
  - [Project Proponent](#project-proponent)
  - [Technical Advisory Committee and NGO Supporters](#technical-advisory-committee-and-ngo-supporters)
- [Workflow at a glance](#workflow-at-a-glance)
- [Important schemas](#important-schemas)
- [How the calculation is wired](#how-the-calculation-is-wired)
- [Token](#token)
- [Importing the policy](#importing-the-policy)
- [Step-by-step](#step-by-step)
- [Differences from TPDDTEC v3.1](#differences-from-tpddtec-v31)
- [Scope of this pull request](#scope-of-this-pull-request)
- [References](#references)

<!-- /TOC -->

## What this is

A Hedera Guardian policy that implements Gold Standard's
**Technologies and Practices to Displace Decentralized Thermal Energy
Consumption methodology, version 5.0.0** — the Paris-Agreement-aligned
revision of TPDDTEC, published by Gold Standard under the working title
*Reduced Emissions from Cooking and Heating (RECH)*.

The policy walks a cooking/heating project end-to-end on the Hedera ledger:
proponent onboarding → project listing → validation → monitoring →
verification → token mint, with every step recorded as a verifiable
credential. The output is a Verified Emission Reduction (VER) token,
one per tCO2e.

This v5.0 policy supersedes the TPDDTEC **v3.1** bundle. The methodology's
own description states it is "a revised version of the Technologies and
Practices to Displace Decentralized Thermal Energy Consumption (TPDDTEC)
v3.1 methodology", and it must be used in conjunction with the GHG Emissions
Reduction & Sequestration Product Requirements. Projects applying it may be
issued GSVERs.

**Scope note.** v5.0 covers **unmetered** technologies — improved biomass
cookstoves, charcoal stoves, thermal practices. Metered devices (electric
induction, metered biogas, metered LPG) moved out of TPDDTEC and are covered
by the separate [MECD](../MECD%20v2.0/readme.md) methodology. If a device can
report its own consumption, it belongs in MECD, not here.

## What's in this folder

```
TPDDTEC v5.0/
├── Gold Standard - Technologies and Practices to Displace Decentralized
│   Thermal Energy Consumption (TPDDTEC) v5.0.0 (3.0).policy  ← import this
└── readme.md                                                  ← you are here
```

This is an **initial pull request**. Test cURL requests, fixtures and
screenshots are not included yet — see
[Scope of this pull request](#scope-of-this-pull-request).

Unpacking the `.policy` archive gives:

| Path | Contents |
|---|---|
| `policy.json` | Workflow config — 5 roles, ~200 blocks, mint logic |
| `schemas/` | 50 policy schemas (PDD, Monitoring Report, Emission Reductions, CDM additionality tools, stakeholder consultation) |
| `systemSchemas/` | 14 Guardian system schemas |
| `formulas/` | 1 formula document — the four published quantification equations |
| `tokens/` | `VER.json` — fungible, 0 decimals |
| `artifacts/`, `tools/`, `tests/`, `tags/`, `ipfs/` | empty in this bundle |

## Cooking and heating projects in plain English

Roughly **2.1 billion people** still cook on open fires or basic biomass
stoves. The smoke drives millions of premature deaths a year, much of the
wood is harvested from non-renewable sources, and the soot is a measurable
short-lived climate forcer.

A TPDDTEC project distributes an improved technology — a more efficient
biomass stove, a charcoal stove, an institutional cooker, a retained-heat
device — and earns carbon credits for the fuel it avoids burning relative to
what those households or institutions would otherwise have used.

The hard part is proving the avoidance, and for **unmetered** devices it is
harder than for metered ones. Nothing phones home. Three things have to be
established by survey and measurement rather than by telemetry:

1. **How much fuel the baseline device burned** — a Baseline Kitchen
   Performance Test (B-KPT), or a conservative default.
2. **How much fuel the project device burns** — a Project KPT (P-KPT),
   repeated biennially.
3. **Whether the device is actually being used** — usage surveys, or Stove
   Use Monitors (SUMs), plus a stove-stacking assessment for households that
   keep using the old stove alongside the new one.

Because all three come from sampled human measurement, TPDDTEC v5.0 wraps
each of them in a statistical or conservativeness adjustment. That stack is
the substance of the v5.0 revision.

## Why TPDDTEC, and why v5.0

A 2023 [University of California, Berkeley study](https://gspp.berkeley.edu/berkeley-carbon-trading-project/cookstoves/how-the-methodologies-work)
found cookstove projects across all major standards over-credited by roughly
**9× on average**, with survey-based improved-cookstove methodologies among
the worst offenders. TPDDTEC v3.1 was one of the methodologies implicated.

v5.0 is the response. Gold Standard's stated changes:

- **Sharpened scope** — unmetered technologies only; metered devices move to
  MECD, where direct measurement is available.
- **A mandatory five-step baseline-setting process**, so baselines are
  derived consistently rather than argued case by case.
- **Downward Adjustment Factors (DAF)** to align crediting with Net-Zero
  ambition, sourced annually from the GS4GG tool.
- **Per-capita baseline caps** to stop implausibly high baselines
  (1.25 t/person/yr wood-equivalent, 0.40 for charcoal in this
  implementation).
- **A mandatory Hawthorne Effect adjustment** — a haircut for the fact that
  households behave differently when they know a test is running, tightening
  over time (0.85 through 2029, 0.75 thereafter under default measurement).
- **A mid-crediting-period gap-validation pathway**, letting live projects
  adopt the new integrity rules without a full re-validation.

The trade is the same one MECD v2.0 made: materially fewer credits per
period, but each credit far harder to dispute.

## Conservativeness stack — the v5.0 difference in one picture

The calculator runs a baseline → activity → leakage subtraction, then layers
v5.0 conservativeness on top:

```
  mean baseline consumption (Pb_mean, from B-KPT / MSL / default)
         │
         ▼  90/10 uncertainty rule → use LB90 if precision not met
         ▼  per-capita cap  (1.25 wood / 0.40 charcoal)
         ▼
  Pb_adj
         │
         ▼  × N_days × usage rate × NCV × (fNRB·EF_CO2 + EF_nonCO2)
         ▼
  BE_unc  (unadjusted baseline emissions)
         │
         ▼  × (1 − DAF)          ← Net-Zero ambition haircut
         ▼  MIN(BE_adj, BAU)     ← business-as-usual ceiling
         ▼
  BE_y  ◄──── crediting baseline
         │
         ▼  − AE_y   (activity emissions, from Pp_adj)
         ▼  × HE_ind (Hawthorne Effect adjustment)
         ▼  − LE_y   (2% market leakage + 0.017 tCO2e × new units)
         ▼  MAX(0, …)
         ▼
  ER_y  ──►  select vintage  ──►  mint VER tokens
```

Each step in one line:

| Step | What it actually does |
|---|---|
| 90/10 rule | If the KPT sample is too small or noisy to be 90% confident within ±10% of the mean, use the conservative bound instead of the mean — lower bound on the baseline side, upper bound on the project side. |
| Per-capita cap | Clips the adjusted baseline to a plausible per-capita consumption ceiling. Stops fictional baselines built from unrepresentative samples. |
| MSL | If suppressed demand is claimed, baseline consumption falls back to a Minimum Service Level default (0.5 t wood, 0.13 t charcoal) with a further 5% deduction. |
| fNRB | Fraction of woody biomass that is non-renewably sourced. Only that fraction earns CO2 credit. Fixed ex-ante or updated biennially. |
| DAF | Flat annual downward adjustment factor for Net-Zero ambition, taken from the GS4GG tool. Mandatory safety margin. |
| BAU ceiling | Caps the crediting baseline at business-as-usual emissions, so a project cannot claim credit for reductions that were going to happen anyway. |
| Hawthorne Effect (HE_ind) | Haircut for observation bias in KPTs. 0.85 for vintages through 2029, 0.75 after; under SUMs monitoring it becomes `MIN(1, PTC_measured / PTC_KPT)`. |
| Market leakage | Default 2% of net reductions, unless a detailed leakage assessment is submitted. |
| Embodied leakage | 0.017 tCO2e per newly disseminated unit, booked in the year of dissemination. |
| Stove stacking | Fraction of continued parallel use of the baseline technology. Captured annually. |

## Roles and what each one does

The policy declares five roles: `Project_Proponent`, `VVB`,
`Technical Advisory Committee`, `NGO Supporters`, and `Gold Standard`
(the Standard Registry / OWNER).

### Gold Standard (Standard Registry)

Owns the policy. Approves Project Developer and VVB registrations, manages
the project pipeline, approves or rejects monitoring reports, selects the
vintage year, and triggers the mint. Also holds revocation rights on VVBs,
projects and reports, and owns the Trust Chain and Token History views.

### VVB — Validation & Verification Body

Independent third-party auditor. Registers via the VVB schema and waits for
Gold Standard approval. Two distinct jobs:

- **Validation** — sign off that the project design (baseline choice,
  eligibility, additionality tool, sampling plan) is methodologically sound.
- **Verification** — for each monitoring period, audit the KPT and usage
  survey data behind the monitoring report and sign off on the calculated ER.

### Project Proponent

The organisation deploying the technology. Registers via the Project
Developer schema, then submits the Project Description (PDD) and, per period,
the Monitoring Report. Receives the minted VER tokens.

### Technical Advisory Committee and NGO Supporters

Both roles share a read-and-comment surface over the project pipeline and the
monitoring reports. They cannot approve or reject; they attach comments to
documents in flight. This is TPDDTEC's implementation of Gold Standard's
stakeholder and expert-review requirements, and it is the main structural
difference from the MECD policy, which has no equivalent role.

## Workflow at a glance

1. **VVB registers** and is approved by Gold Standard.
2. **Project Proponent registers** (Project Developer schema) and is approved.
3. **Project Proponent submits a Project Description** — key project
   information, stakeholder consultation, the PDD proper, and the ex-ante
   Emission Reductions block. On submission, `calculate_project_fields` runs
   the ex-ante conservativeness stack.
4. **Gold Standard reviews the project pipeline** and approves or rejects the
   listing. TAC and NGO Supporters may comment.
5. **VVB validates** the listed project.
6. **Project Proponent submits a Monitoring Report** for the period —
   annual report, updated KPT and usage figures, per-vintage Emission
   Reductions rows. `calculate_report_fields` recomputes the full stack.
7. **VVB verifies** the monitoring report. TAC and NGO Supporters may comment.
8. **Gold Standard approves the report**, then enters the **Vintage year** to
   be issued.
9. `find_mint_by_vintage` matches that vintage against the report's ER rows
   and writes the matching `er_y` into the mint field `G533`.
10. **VER tokens** mint to the Project Proponent's Hedera account, one per
    tCO2e, rounded.

Every step is a verifiable credential signed by the relevant role and
hash-anchored to a Hedera Consensus Service topic, so any minted credit
traces back through every approval that produced it.

## Important schemas

50 schemas ship in the bundle. The ones a reviewer or implementer needs:

| Schema | What it captures |
|---|---|
| Project Developer | Proponent onboarding details. |
| VVB | VVB onboarding details. |
| Key Project Information | GS ID, title, host country, geo-coordinates, technology, scale, crediting period dates, participants. Includes the LUF (land-use & forest) block. |
| Project Design Document | Sections A–E of the GS PDD — description, methodology application, baseline scenario, additionality, SDG outcomes, ex-ante parameters, monitoring plan, crediting period, safeguarding and gender assessment, stakeholder consultation summary. |
| Project Description | The submitted container: Key Project Information + Stakeholder Consultation + an array of ex-ante Emission Reductions rows. |
| Monitoring Report | Key Project Information + PDD reference + Stakeholder Consultation + Annual Report + an array of per-vintage Emission Reductions rows + the mint field. |
| **Emission Reductions** | The per-vintage calculation row. Inputs (`nb_p_y`, `up_y`, `pp_mean`, `daf_netzero_y`, `n_disseminated`, `stove_stacking_fraction`, `fnrb_b_y`) and outputs (`pb_adj`, `pp_adj`, `be_unc`, `be_adj`, `be_y`, `ae_y`, `embodied_le`, `le_market_y`, `le_y`, `he_ind`, `er_y`). Also carries the eligibility evidence fields: double-counting waivers, IAP/PM2.5 assessment, regulatory compliance, baseline survey, end-user carbon-rights notification. |
| Baseline Parameters | `baseline_fuel_type`, `fnrb`, household size, `pb_mean`, `Pb_LB90`, `meets9010`, MSL default, and the four emission factors and two NCVs. |
| Project Technology Parameters | Device model, thermal efficiency, technical life. |
| Stakeholder Consultation | Sections A–E — information made available, invitation tracking, meeting minutes, comment assessment, grievance mechanism, feedback round. |
| Annual Report | GS annual reporting form 1.1–1.16, grievance activity, incidents, disputes, declaration and signatures. |
| Vintage | Single numeric field. The Standard Registry's vintage-year selection at mint time. |
| Tool 01 / Tool 19 / Tool 21 | The three CDM additionality pathways, plus the sub-schemas for each step (identification of alternatives, investment analysis, barrier analysis, common practice analysis) and the small-scale PA/CPA variants. |
| Type I / Type II / Type III | Small-scale project activity type declarations. |

## How the calculation is wired

There are **three** representations of the maths in this bundle. They serve
different purposes and a reviewer should know which is authoritative.

**1. The formula document** (`formulas/`) — *documentation only.*
Named "Net Emission Reduction for baseline b/ project p pair", it holds the
four published quantification equations in LaTeX, each variable linked to its
schema field:

- **Method 1** — `ER_y = N × U × SFS × NCV × (fNRB·EF_CO2 + EF_nonCO2)`,
  driven by specific fuel savings.
- **Method 2** — `ER_y = N × U × (SFC_b − SFC_p) × (fNRB·EF_CO2 + EF_nonCO2) × NCV`,
  driven by the difference in specific fuel consumption.
- **Method 3 (non-fossil)** — separate `BE_y` and `PE_y` from specific
  emissions, `Net ER = BE − PE − ΣLE`.
- **Method 3 (fossil)** — as above, with project specific emissions derived
  from the baseline via the `BSE/PSE` ratio.

These render in Guardian's formula viewer. They are not executed.

**2. The `customLogicBlock` scripts** — *what actually runs.*
`calculate_project_fields` (ex-ante, on the PDD) and
`calculate_report_fields` (ex-post, on the monitoring report) carry the same
JavaScript: `calculateAdjustedBaseline` → `calculateBaselineEmissions` →
`calculateAdjustedProjectConsumption` → `calculateActivityEmissions` →
`calculateLeakage` → `calculateHEind` → `calculateNetEmissionReductions`,
mapped over every row of the ER array. Output is written back into the same
schema.

**3. The `mathBlock` (`FCB`)** — *a declarative mirror.*
Reads and writes the Project Description schema, declares 17 linked input
variables and seven formula groups (`eqPbAdj`, `eqPpAdj`, `eqBeUnc`/`eqBeY`,
`eqAeY`, `eqEmbodiedLe`, `eqHeInd`, `eqErY`) in Guardian's Map/At/Boole
expression syntax, plus a small post-processing script that defaults
`he_ind` to 0.75 and recomputes `er_y` when the vintage year is
non-numeric.

**Mint path.** `find_mint_by_vintage` (customLogicBlock) takes the vintage
the Standard Registry entered, walks the monitoring report's `G401` ER rows,
finds the row whose `Year` matches, and writes that row's `er_y` into
`G533`. `mintDocumentBlock` then mints against `rule: G533` with
`roundMethod: round`.

## Token

**VER (Verified Emission Reduction)** — fungible, `decimals: 0`, so one
token = one tCO2e. Minted to the Project Proponent's Hedera account when the
Standard Registry confirms the vintage. KYC, freeze, wipe and admin keys are
all enabled; supply is mutable.

Note: the token is currently flagged `draftToken: true` and `policyTokens`
in `policy.json` is empty — the token is carried in `tokens/VER.json` rather
than inline. It binds on import.

## Importing the policy

- **From file** — drop the `.policy` file into Guardian's policy import
  dialog. This is the supported path for this PR.
- **From IPFS / Hedera topic** — not yet published to a public registry
  topic. The bundle carries a testnet instance topic (`0.0.1780996861588`)
  and a testnet issuer DID from the authoring environment; both are
  re-created on import into a new instance.

Once imported, publish the policy as the Standard Registry user, then
register a VVB and a Project Proponent and walk the workflow.

## Step-by-step

### Standard Registry flow

1. Log in as the Standard Registry and open the imported policy.
2. Approve Project Developer registrations (the first, untitled grid —
   see note 17).
3. Approve VVB applications (**Approve VVB** grid).
4. Review the **Project Pipeline** — approve, reject or revoke project
   listings.
5. Review **Monitoring Reports** — approve, reject or revoke.
6. On approval, enter the **Vintage** year to be issued. This is the trigger
   for the mint; the ER row matching that year is what gets minted.
7. Inspect **Token History** and the **Trust Chain** for any minted credit.

### Project Proponent flow

1. Register via the Project Developer form and wait for approval.
2. Submit a **Project Description**: key project information, stakeholder
   consultation, PDD, and ex-ante Emission Reduction rows (one per expected
   vintage). Baseline parameters — fuel type, fNRB, `pb_mean`, `Pb_LB90`,
   the 90/10 flag, emission factors and NCVs — go in here.
3. Once listed and validated, submit a **Monitoring Report** per period.
   Most structure repeats from the PDD; the period-specific values are
   `nb_p_y` (operational technology-days), `up_y` (usage rate),
   `pp_mean` (P-KPT result), `daf_netzero_y`, `n_disseminated` and the
   stove-stacking fraction.
4. Resubmit if the report comes back rejected.
5. Once verified and approved, VER tokens appear in the **Tokens** grid and
   in the proponent's Hedera account.

### VVB flow

1. Register and wait for approval; resubmit if rejected.
2. **Projects** — review the baseline derivation, additionality tool
   selection (Tool 01 / 19 / 21), sampling plan and safeguards. Approve or
   revoke.
3. **Monitoring Reports** — spot-check the KPT results, the 90/10 precision
   determination, the usage survey, the DAF value applied, and the
   dissemination count. Approve.

### TAC / NGO Supporter flow

1. Open **Project Pipeline** or **Monitoring Reports**.
2. Attach comments to any document in flight. No approval authority.

## Differences from TPDDTEC v3.1

| | v3.1 | v5.0 |
|---|---|---|
| Scope | metered and unmetered technologies | **unmetered only** — metered devices move to MECD |
| Baseline setting | case-by-case justification | **mandatory five-step process** |
| Sampling precision | not enforced in the calculation | **90/10 rule** — conservative bound used if precision not met |
| Per-capita cap | none | **1.25 t wood / 0.40 t charcoal** ceiling on adjusted baseline |
| Downward adjustment | none | **DAF**, sourced annually from the GS4GG tool |
| BAU ceiling | not applied | `MIN(BE_adj, BAU)` |
| Hawthorne Effect | not modelled | **mandatory HE_ind** — 0.85 through 2029, 0.75 after; SUMs-based alternative |
| Suppressed demand | MSL defaults | MSL defaults **plus a 5% deduction** |
| Market leakage | project-specific argument | **2% default** unless a detailed assessment is submitted |
| Embodied leakage | not modelled | **0.017 tCO2e × new units disseminated** |
| Stove stacking | qualitative | monitored fraction, reported annually |
| Mid-period adoption | full re-validation | **gap-validation pathway** |
| Paris alignment | n/a | yes — DAF and BAU ceiling are the mechanism |



## Scope of this pull request

This PR contains **the policy file and this readme only**.

Not included, and intended for follow-up:

- `test-curls/` — sanitised API requests for PDD and monitoring report
  submission.
- `test-fixtures/` — worked ER fixtures with a parameter map, to pin the
  calculation against hand-computed values.
- Screenshots for the methodology-specific steps (PDD submission, vintage
  selection, mint, trust chain).
- A published IPFS / Hedera registry topic ID.

Reviewers testing this bundle will need to build submissions by hand from
the Guardian UI.

## References

- [Gold Standard — Reduced Emissions from Cooking and Heating (RECH) v5.0, formerly TPDDTEC](https://www.goldstandard.org/consultations/paa-tpddtec)
- [Gold Standard — TPDDTEC methodology revision consultation](https://www.goldstandard.org/consultations/tpddtec-methodology-revision-improved-cookstoves)
- [TPDDTEC v3.1 methodology PDF](https://globalgoals.goldstandard.org/standards/407_V3.1_EE_ICS_Technologies-and-Practices-to-Displace-Decentrilized-Thermal-Energy-TPDDTECConsumption-.pdf)
- [Gold Standard TPDDTEC methodology page](https://globalgoals.goldstandard.org/407-ee-ics-technologies-and-practices-to-displace-decentrilized-thermal-energy-tpddtec-consumption/)
- [Berkeley Carbon Trading Project — how cookstove methodologies work](https://gspp.berkeley.edu/berkeley-carbon-trading-project/cookstoves/how-the-methodologies-work)
- [Hedera Guardian documentation](https://docs.hedera.com/guardian/)
