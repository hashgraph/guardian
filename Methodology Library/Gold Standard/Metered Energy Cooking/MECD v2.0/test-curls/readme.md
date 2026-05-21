# Test curls

Sanitised cURL requests for end-to-end policy validation against a running
Guardian instance. They cover one PDD submission and seven monitoring-report
ER calculations across all three PAA methods × three project-fuel branches.

Every ER curl ships with **realistic ATEC GS11817 parameters** and is
**schema-conformant** (every `required` field on the ER Document schema and
its sub-schemas is populated, including the legacy verbose camelCase names
that the schema still requires alongside the modern snake_case ones). Each
produces a **positive ER** when run through the policy, suitable for
capturing UI screenshots that show real credit numbers.

## Expected ER per curl

| File | Method | Project fuel | ER (tCO2e/yr) | Per-stove (tCO2e/yr) |
|---|---|---|---:|---:|
| `02-er-method-1-electricity.txt` | M1 (WBT) | Electricity (induction) | 1193 | 0.795 |
| `02-er-method-1-fossil.txt`      | M1 (WBT) | Fossil fuel (LPG)      | 1256 | 0.838 |
| `02-er-method-1-renewable.txt`   | M1 (WBT) | Renewable fuel (biogas)| 1608 | 1.072 |
| `02-er-method-2-electricity.txt` | M2 (CCT) | Electricity (induction)| 1213 | 0.809 |
| `02-er-method-2-fossil.txt`      | M2 (CCT) | Fossil fuel (LPG)      | 1253 | 0.836 |
| `02-er-method-2-renewable.txt`   | M2 (CCT) | Renewable fuel (biogas)| 1452 | 0.968 |
| `02-er-method-3-fossil.txt`      | M3 (KPT) | Fossil fuel (LPG)      | 1515 | 1.010 |

(Project: 1500 stoves over 2024 calendar year. Baseline: 80% wood + 11% NG +
9% LPG. Per-stove ER aligns with the 0.8154 tCO2e/stove/yr value Earthood
verified for ATEC's GS11817 deployment under MECD v1.2.)

## A note on `no_of_days_per_year` for the M2/Electricity curl

The Method 2 baseline calc treats `EGp_d_y` as kWh/day when
`no_of_days_per_year` is truthy, and as annual MWh otherwise — a units
quirk in the v1.2 calc. To produce correct fleet numbers across both BE
and AE paths, the M2/Electricity payload sets `no_of_days_per_year: 0`,
which the schema accepts (the field is `type: number` with no minimum).
M1 and M3 payloads keep `no_of_days_per_year: 365` because their BE paths
don't read this field.

## Before running

1. Import `MECD-v2.0.policy` into your Guardian instance, register a
   Project Proponent role, and complete a PDD using `01-pdd.txt`.
2. Open the policy in the API explorer and note the **policy ID** and the
   **block ID** for each step (they appear in the URL of the corresponding
   block).
3. Get a Guardian API bearer token for your Project Proponent user.
4. Replace the three placeholders in each file:
   - `<YOUR_GUARDIAN_HOST>`
   - `<POLICY_ID>` and `<BLOCK_ID>`
   - `<YOUR_GUARDIAN_API_TOKEN>`

## File order

| File | What it does |
|---|---|
| `01-pdd.txt` | Submits the Project Design Document (ATEC PoA GS11815 / VPA02). |
| `02-er-method-{1,2,3}-{electricity,fossil,renewable}.txt` | Submits a monitoring-period ER for one method × project-fuel combination. |

## How the ER numbers were derived

The payloads use ATEC GS11817's verified v1.2 parameters as the source of
truth (see [`../test-fixtures/parameter-map.md`](../test-fixtures/parameter-map.md)
for cell-by-cell sourcing). v2.0-only fields (UEF, CTEC integrity, retest
schedule, baseline consistency check) are filled with conservative-but-realistic
defaults documented in the same parameter map.

The seven combinations vary the **project fuel** (electric induction, LPG,
biogas) and the **quantification method** (M1 WBT, M2 CCT, M3 KPT). The
baseline is the same multi-fuel ATEC mix in all cases. The minor differences
in per-stove ER across methods are expected — each PAA method credits a
slightly different physical accounting basis (see [`../readme.md`](../readme.md)).

## Want to extend or modify these?

The realistic JSON fixtures these payloads were spliced from live in
[`../test-fixtures/`](../test-fixtures/), with a Node helper
(`run-fixture.js`) that runs the calc locally without standing up a Guardian
instance. Easiest workflow: edit the JSON, run the helper to confirm the
new ER, then splice back into the curl shell.
