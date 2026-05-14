# MECD v1.2 → v2.0 migration guide

This is the practical version. For full methodology context see the
[main readme](readme.md).

## Who this is for

- A Project Proponent currently issuing credits under the v1.2 policy and
  deciding when to upgrade.
- A VVB onboarding to v2.0 verifications.
- A Standard Registry operator publishing the new policy.
- A Guardian operator running both versions in parallel during a transition.

## Decision matrix

| Situation | What to do |
|---|---|
| New project, listing for the first time | **Use v2.0.** No reason to start on v1.2. |
| Live v1.2 project, mid-crediting-period | **Stay on v1.2** until the period ends. Contracts and PDDs reference v1.2 baselines; switching mid-period creates more friction than it's worth. |
| Live v1.2 project, renewing the crediting period | **Migrate to v2.0** at renewal. Treat it as a fresh PDD using v2.0 schemas and the v2.0 conservativeness stack. |
| Live v1.2 project, methodology was updated by GS | Check what GS requires. v2.0 is the active version going forward; v1.2 will be deprecated on a timeline GS sets. |

## What changes for the Project Proponent

### New PDD fields you'll need to fill

These didn't exist in v1.2 and have to be answered before the first v2.0
monitoring period:

- **Methodology method** — pick one: Method 1 (WBT), Method 2 (CCT), or
  Method 3 (KPT). Most existing v1.2 projects used Method 2; that's still
  the closest analog under v2.0.
- **CTEC monitoring mode** — usually `full_census` for projects using
  smart-meters on every device; `sample_based` only with justification.
- **Metering system description** — one paragraph on the meter hardware,
  data path, and audit trail.
- **Project tech useful lifetime** — years; ATEC eCook is 10.
- **Performance retest schedule** — when each cohort of stoves was last
  performance-tested and when the next retest is due. Biennial cadence is
  mandatory.

### New monitoring-report fields you'll need at every period

| Field | What to put |
|---|---|
| `ctec_integrity_summary` | Coverage stats: total deployed, total reporting, % coverage. Must be ≥95% or the period is flagged. |
| `data_gap_summary` | Devices with data gaps and how they were handled (25th-percentile fill or exclusion). |
| `performance_monitoring_summary` | Last performance test date and next retest due date. Calc fail-fasts if either is missing or the next retest is overdue. |
| `baseline_consistency_check` | PDD baseline mix vs. observed mix. If drift exceeds 10% on any fuel share, recalculation is required. |
| `dynamic_fnrb_update` | Per-period fNRB value; capped at the previous period's value if newly higher. |
| `usage_and_demographic_monitoring` | Population covered, household composition, operational device count. |

### New credit math

Every period:

1. Baseline emissions get a **UEF bump** for each fuel (small for wood/LPG,
   bigger for charcoal due to kiln losses).
2. The **90/10 uncertainty rule** kicks in if your sampling isn't tight
   enough — uses the upper-bound η, which means a *lower* baseline and
   *fewer* credits.
3. The back-calculated baseline gets clipped at the **PCAP** if it implies
   implausible per-capita fuel use.
4. **DAF** applies as a flat haircut.
5. Baseline is clipped at the **NDC BAU ceiling** for the host country.
6. Project emissions get **MPE-adjusted** if your meters are rated worse
   than ±2.5%.
7. **Embodied leakage** (0.017 tCO2e × N_disseminated) is booked in the
   deployment year.

Net per-stove ER drops by 15–35% vs v1.2. Plan revenue projections
accordingly. Embodied leakage hits once per device, only in the year it's
deployed — so a steady-state programme amortises it across years and the
hit is more painful in early years than late ones.

### What does **not** change

- The **VER token** is the same — fungible, one per tCO2e.
- The **trust chain** structure is the same — PDD → validation → MR →
  verification → mint.
- The **role model** is the same — Standard Registry, VVB, Project Proponent.
- The **Hedera mechanics** are the same — Hedera Consensus Service for the
  audit trail, Hedera Token Service for the VER.

## What changes for the VVB

### Validation

PDDs now declare **methodology method** (M1/M2/M3) and a **CTEC monitoring
mode**. Verify both — and verify the project's metering system actually
supports the declared mode (`full_census` requires every device reporting,
`sample_based` requires a defensible sampling plan with statistical power).

The PDD also has to declare the **fNRB source** and the **upstream
emission factors** for each baseline fuel. Spot-check the UEFs against
recognised lifecycle inventories (default values are fine for wood, LPG,
NG; charcoal needs a region-specific source).

### Verification

For each monitoring period, additionally check:
- **CTEC coverage** — at least 95% of deployed devices reporting data; lower
  coverage means the period is flagged "under_review" and should not mint.
- **Performance retest dates** — the previous retest must be within 24
  months of the current period; the next retest must be scheduled.
- **Baseline consistency** — re-survey baseline fuel shares; if drift
  exceeds 10%, the baseline must be recalculated for the period.
- **MPE compliance** — meter accuracy ratings should be on file for spot-check.
- **Embodied leakage** — confirm `n_disseminated_y` matches the actual count
  of new devices commissioned during the period.

The 90/10 precision check is automated by the calculator; the VVB just
verifies the input data quality (sample size, variance) is consistent with
what the calculator claims.

## What changes for the Standard Registry

### Token configuration

VER token configuration has not changed.

### Topic / role configuration

v2.0 ships with the same three roles as v1.2 (Project Proponent, VVB,
Standard Registry). No additional topic configuration is needed.

### Running v1.2 and v2.0 in parallel

Operators with live v1.2 projects can publish v2.0 alongside v1.2 — the two
policies don't share state and don't interfere. Keep both visible in the
policy list during the transition.

When the last v1.2 project completes its current crediting period, the v1.2
policy can be retired by un-publishing it (it stays readable in the policy
viewer for trust-chain inspection).

## What this means for credit volumes

Plan for **15–35% fewer credits per monitoring period** vs. an equivalent
v1.2 calculation, plus a **one-time embodied-leakage charge** of
`0.017 tCO2e × N_disseminated` in the deployment year.

A worked example: ATEC's GS11817 deployment was credited at 0.815
tCO2e/stove/yr under v1.2. Under v2.0 with the same input data and Method
2, the same project produces ≈0.81 tCO2e/stove/yr — essentially identical
because ATEC's data is high-quality (full CTEC coverage, no fuel-mix drift,
meters within ±2.5% MPE). Projects with looser data quality, smaller
sampling, or noisier meters will see larger reductions.

Per-device numbers compared in
[`test-fixtures/parameter-map.md`](test-fixtures/parameter-map.md).

## Open questions for Gold Standard

These came up while implementing v2.0 and aren't fully resolved at the
methodology level — flag for guidance:

1. **DAF default value** — PAA recommends a range (typically 0.05–0.10).
   GS guidance on the default would help operators.
2. **BAU ceiling lookup** — the policy currently has no NDC database
   integration; operators have to compute the ceiling externally and
   supply it as a field. A reference list per host country would help.
3. **Embodied leakage scope** — current v2.0 spec uses a flat 0.017
   tCO2e/device default. Project Proponents distributing larger or more
   resource-intensive stoves may need to compute their own LCA-derived
   value; the methodology should clarify whether and how that's allowed.
